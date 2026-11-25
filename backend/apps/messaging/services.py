import os
from datetime import timedelta
from django.conf import settings
from django.db import transaction, models, connection
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from apps.messaging.models import (
    Conversation,
    ConversationParticipant,
    Message,
    MessageAttachment,
    MessageType,
)
from apps.applications.models import Application
from apps.companies.models import Company
from apps.jobs.models import Report, ReportStatus
from apps.notifications.models import Notification, NotificationType
from shared.constants.roles import Role
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def get_user_company(user):
    if getattr(user, "role", "") != Role.RECRUITER and not getattr(user, "is_superuser", False):
        return None
    company = Company.objects.filter(admin_user=user).first()
    if not company and getattr(user, "company", None):
        company = user.company
    return company


class MessagingService:
    @staticmethod
    def get_or_create_conversation(user, application_id=None, recipient_user_id=None):
        """
        Creates or retrieves a conversation.
        Only a recruiter can initiate a conversation with a candidate who applied to their company.
        Candidates can access conversations where they are already participants.
        """
        if not user.is_authenticated or not user.is_active:
            raise PermissionDenied("User is inactive or not authenticated.")

        if user.suspended_at:
            raise PermissionDenied("Suspended users cannot access messaging.")

        application = None
        target_user = None

        if application_id:
            try:
                application = Application.objects.select_related(
                    "candidate__user", "job__company", "job__created_by"
                ).get(id=application_id)
            except Application.DoesNotExist:
                raise NotFound("Application not found.")

            candidate_user = application.candidate.user
            company = application.job.company

            if user.role == Role.RECRUITER or getattr(user, "is_superuser", False):
                # Verify recruiter belongs to the job's company or is superuser
                recruiter_company = get_user_company(user)
                if not getattr(user, "is_superuser", False) and recruiter_company != company:
                    raise PermissionDenied("You can only message applicants for your company's jobs.")
                target_user = candidate_user
            elif user.role == Role.CANDIDATE:
                if application.candidate.user_id != user.id:
                    raise PermissionDenied("You can only access conversations for your own applications.")
                target_user = application.job.created_by or company.admin_user
            else:
                target_user = candidate_user
        elif recipient_user_id:
            if user.id == recipient_user_id:
                raise ValidationError("Cannot create a conversation with yourself.")
            
            from apps.accounts.models import User
            try:
                target_user = User.objects.get(id=recipient_user_id, is_active=True)
            except User.DoesNotExist:
                raise NotFound("Recipient user not found.")

            if user.role == Role.CANDIDATE and target_user.role == Role.RECRUITER:
                # Candidate cannot initiate blind outreach unless an application exists
                has_application = Application.objects.filter(
                    candidate__user=user,
                    job__created_by=target_user
                ).exists() or Application.objects.filter(
                    candidate__user=user,
                    job__company__admin_user=target_user
                ).exists()
                if not has_application:
                    raise PermissionDenied("Candidates can only message recruiters after submitting an application.")
            elif user.role == Role.RECRUITER:
                company = get_user_company(user)
                has_application = Application.objects.filter(
                    candidate__user=target_user,
                    job__company=company
                ).exists()
                if not has_application and not getattr(user, "is_superuser", False):
                    raise PermissionDenied("You can only initiate conversations with candidates who have applied to your company.")
        else:
            raise ValidationError("Either application_id or recipient_user_id must be provided.")

        with transaction.atomic():
            # Concurrency protection: serialize creation for the same pair of users
            if connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT pg_advisory_xact_lock(%s, %s);",
                        [min(user.id, target_user.id), max(user.id, target_user.id)]
                    )

            # Determine candidate and company
            candidate = user if user.role == Role.CANDIDATE else target_user
            company = (
                application.job.company
                if application
                else (get_user_company(user) or get_user_company(target_user))
            )

            # 1. Search existing conversation between candidate and this company
            if candidate and company:
                company_conv = (
                    Conversation.objects.filter(
                        participants__user=candidate,
                        application__job__company=company,
                    )
                    .order_by("-last_message_at")
                    .first()
                )
                if company_conv:
                    if application and company_conv.application_id != application.id:
                        company_conv.application = application
                        company_conv.save(update_fields=["application"])
                    ConversationParticipant.objects.get_or_create(
                        conversation=company_conv, user=user
                    )
                    ConversationParticipant.objects.get_or_create(
                        conversation=company_conv, user=target_user
                    )
                    return company_conv

            # 2. Check existing conversation by application
            if application:
                existing_conv = Conversation.objects.filter(application=application).first()
                if existing_conv:
                    ConversationParticipant.objects.get_or_create(
                        conversation=existing_conv, user=user
                    )
                    ConversationParticipant.objects.get_or_create(
                        conversation=existing_conv, user=target_user
                    )
                    return existing_conv

            # 3. Search existing conversation by direct user pair
            user_conv_ids = ConversationParticipant.objects.filter(user=user).values_list("conversation_id", flat=True)
            common_conv_id = ConversationParticipant.objects.filter(
                conversation_id__in=user_conv_ids, user=target_user
            ).values_list("conversation_id", flat=True).first()

            if common_conv_id:
                pair_conv = Conversation.objects.filter(id=common_conv_id).first()
                if pair_conv:
                    if application and not pair_conv.application:
                        pair_conv.application = application
                        pair_conv.save(update_fields=["application"])
                    return pair_conv

            # 4. Create new conversation if no thread exists
            conv = Conversation.objects.create(
                application=application,
                created_by=user,
                last_message_at=timezone.now(),
            )
            ConversationParticipant.objects.create(conversation=conv, user=user, last_read_at=timezone.now())
            ConversationParticipant.objects.create(conversation=conv, user=target_user, last_read_at=timezone.now())

            # Send a system message indicating thread creation if tied to an application
            if application:
                job_title = application.job.job_title
                company_name = application.job.company.name
                Message.objects.create(
                    conversation=conv,
                    sender=None,
                    message_type=MessageType.SYSTEM,
                    content=f"Conversation started regarding the {job_title} application at {company_name}.",
                    is_read=True,
                )

            return conv

    @staticmethod
    def send_message(user, conversation_id, content="", message_type=MessageType.TEXT, files=None):
        if not user.is_authenticated or not user.is_active or user.suspended_at:
            raise PermissionDenied("Suspended or inactive users cannot send messages.")

        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            raise NotFound("Conversation not found.")

        # Check membership
        my_participant = ConversationParticipant.objects.filter(
            conversation=conv, user=user, is_active=True
        ).first()
        if not my_participant:
            raise PermissionDenied("You are not an active participant in this conversation.")

        content = (content or "").strip()
        if not content and not files and message_type == MessageType.TEXT:
            raise ValidationError("Message content or an attachment is required.")

        with transaction.atomic():
            msg = Message.objects.create(
                conversation=conv,
                sender=user,
                message_type=MessageType.ATTACHMENT if files else message_type,
                content=content,
                is_read=False,
            )

            attachments_data = []
            if files:
                for f in files:
                    # Validate size (10MB limit)
                    if f.size > 10 * 1024 * 1024:
                        raise ValidationError(f"File {f.name} exceeds the 10 MB maximum limit.")

                    att = MessageAttachment.objects.create(
                        message=msg,
                        file=f,
                        file_name=f.name,
                        file_size=f.size,
                        mime_type=getattr(f, "content_type", "") or "",
                    )
                    attachments_data.append({
                        "id": att.id,
                        "name": att.file_name,
                        "size": att.file_size,
                        "url": f"/api/v1/conversations/{conv.id}/attachments/{att.id}/",
                        "file_url": att.file.url,
                        "mime_type": att.mime_type,
                    })

                msg.attachments_data = attachments_data
                msg.save(update_fields=["attachments_data"])

            now = timezone.now()
            conv.last_message_at = now
            conv.save(update_fields=["last_message_at", "updated_at"])

            my_participant.last_read_at = now
            my_participant.save(update_fields=["last_read_at"])

        # Broadcast via Django Channels
        MessagingService._broadcast_message(conv, msg, sender_user=user)

        # Trigger notification for other participants
        MessagingService._notify_recipients(conv, msg, sender_user=user)

        return msg

    @staticmethod
    def edit_message(user, conversation_id, message_id, new_content):
        try:
            msg = Message.objects.select_related("conversation").get(id=message_id, conversation_id=conversation_id)
        except Message.DoesNotExist:
            raise NotFound("Message not found.")

        if msg.sender_id != user.id and not getattr(user, "is_superuser", False):
            raise PermissionDenied("You can only edit your own messages.")

        if msg.is_deleted:
            raise ValidationError("Deleted messages cannot be edited.")

        if msg.message_type == MessageType.SYSTEM:
            raise ValidationError("System messages cannot be edited.")

        # 15-minute edit window check
        elapsed = (timezone.now() - msg.created_at).total_seconds()
        if elapsed > 900:  # 15 minutes * 60 seconds
            raise ValidationError("Messages can only be edited within 15 minutes of sending.")

        new_content = (new_content or "").strip()
        if not new_content and not msg.attachments_data:
            raise ValidationError("Message content cannot be blank.")

        msg.content = new_content
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=["content", "is_edited", "edited_at", "updated_at"])

        # Broadcast update
        MessagingService._broadcast_event(
            f"chat_conversation_{msg.conversation_id}",
            {
                "type": "chat.message_updated",
                "message_id": msg.id,
                "conversation_id": msg.conversation_id,
                "content": msg.content,
                "is_edited": True,
                "edited_at": msg.edited_at.isoformat(),
            }
        )

        return msg

    @staticmethod
    def delete_message(user, conversation_id, message_id):
        try:
            msg = Message.objects.get(id=message_id, conversation_id=conversation_id)
        except Message.DoesNotExist:
            raise NotFound("Message not found.")

        if msg.sender_id != user.id and not getattr(user, "is_superuser", False):
            raise PermissionDenied("You can only delete your own messages.")

        msg.is_deleted = True
        msg.content = "This message was deleted."
        msg.attachments_data = []
        msg.save(update_fields=["is_deleted", "content", "attachments_data", "updated_at"])

        # Broadcast update
        MessagingService._broadcast_event(
            f"chat_conversation_{msg.conversation_id}",
            {
                "type": "chat.message_deleted",
                "message_id": msg.id,
                "conversation_id": msg.conversation_id,
            }
        )

        return msg

    @staticmethod
    def mark_conversation_read(user, conversation_id):
        try:
            participant = ConversationParticipant.objects.get(conversation_id=conversation_id, user=user)
        except ConversationParticipant.DoesNotExist:
            raise NotFound("Conversation or participant not found.")

        now = timezone.now()
        participant.last_read_at = now
        participant.save(update_fields=["last_read_at"])

        # Update messages compatibility flag
        Message.objects.filter(
            conversation_id=conversation_id,
            is_read=False
        ).exclude(sender=user).update(is_read=True)

        # Broadcast read receipt to room
        MessagingService._broadcast_event(
            f"chat_conversation_{conversation_id}",
            {
                "type": "chat.read_receipt",
                "conversation_id": conversation_id,
                "user_id": user.id,
                "last_read_at": now.isoformat(),
            }
        )

        # Broadcast unread count update to user's personal channel
        unread_count = MessagingService.get_user_unread_count(user)
        MessagingService._broadcast_event(
            f"user_{user.id}",
            {
                "type": "chat.unread_update",
                "unread_count": unread_count,
                "conversation_id": conversation_id,
            }
        )

        return {"unread_count": unread_count}

    @staticmethod
    def get_user_unread_count(user):
        """Calculates total unread conversations count for user."""
        memberships = ConversationParticipant.objects.filter(
            user=user, is_active=True
        ).select_related("conversation")

        count = 0
        for m in memberships:
            has_unread = Message.objects.filter(
                conversation_id=m.conversation_id,
                created_at__gt=m.last_read_at
            ).exclude(sender=user).exists()
            if has_unread:
                count += 1
        return count

    @staticmethod
    def report_chat(reporter, conversation_id, message_id=None, reason="", description=""):
        if not ConversationParticipant.objects.filter(conversation_id=conversation_id, user=reporter).exists():
            raise PermissionDenied("You can only report chats you participate in.")

        reason = (reason or "").strip()
        if not reason:
            reason = "Inappropriate chat behavior"

        target_type = "message" if message_id else "conversation"
        target_id = message_id if message_id else conversation_id

        report = Report.objects.create(
            reporter=reporter,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            title=f"Chat Report in Conversation #{conversation_id}",
            description=description,
            status=ReportStatus.PENDING,
        )
        return report

    @staticmethod
    def _broadcast_message(conversation, message, sender_user):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        payload = {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender": {
                "id": sender_user.id,
                "full_name": sender_user.full_name,
                "email": sender_user.email,
                "role": sender_user.role,
                "profile_picture_url": sender_user.profile_picture_url,
            } if sender_user else None,
            "message_type": message.message_type,
            "content": message.content,
            "attachments_data": message.attachments_data,
            "is_read": message.is_read,
            "is_edited": message.is_edited,
            "edited_at": message.edited_at.isoformat() if message.edited_at else None,
            "is_deleted": message.is_deleted,
            "created_at": message.created_at.isoformat(),
        }

        # 1. Broadcast to the conversation room
        async_to_sync(channel_layer.group_send)(
            f"chat_conversation_{conversation.id}",
            {
                "type": "chat.message",
                "message": payload,
            }
        )

        # 2. Push unread badge update to all other participants
        other_participants = ConversationParticipant.objects.filter(
            conversation=conversation, is_active=True
        ).exclude(user=sender_user).select_related("user")

        for p in other_participants:
            unread = MessagingService.get_user_unread_count(p.user)
            async_to_sync(channel_layer.group_send)(
                f"user_{p.user_id}",
                {
                    "type": "chat.unread_update",
                    "unread_count": unread,
                    "conversation_id": conversation.id,
                    "last_message": {
                        "content": message.content if not message.attachments_data else (message.content or "Attachment"),
                        "created_at": message.created_at.isoformat(),
                        "sender_name": sender_user.full_name if sender_user else "System",
                    }
                }
            )

    @staticmethod
    def _notify_recipients(conversation, message, sender_user):
        """Sends notification to offline/inactive participants."""
        other_participants = ConversationParticipant.objects.filter(
            conversation=conversation, is_active=True
        ).exclude(user=sender_user).select_related("user")

        sender_name = sender_user.full_name if sender_user else "TalentBridge"

        for p in other_participants:
            # Check if participant has an unread notification for this conversation to prevent notification spam
            existing_notif = Notification.objects.filter(
                user=p.user,
                notification_type=NotificationType.MESSAGE_RECEIVED,
                source_type="conversation",
                source_id=conversation.id,
                is_read=False,
            ).first()

            if not existing_notif:
                redirect_url = f"/candidate/messages?conversationId={conversation.id}" if p.user.role == Role.CANDIDATE else f"/recruiter/messages?conversationId={conversation.id}"
                snippet = message.content[:100] if message.content else "Sent an attachment"

                Notification.objects.create(
                    user=p.user,
                    notification_type=NotificationType.MESSAGE_RECEIVED,
                    title=f"New message from {sender_name}",
                    message=snippet,
                    source_type="conversation",
                    source_id=conversation.id,
                    redirect_url=redirect_url,
                    sent_at=timezone.now(),
                    delivered_at=timezone.now(),
                )

    @staticmethod
    def _broadcast_event(group_name, payload):
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                group_name,
                payload
            )
