from rest_framework import serializers
from apps.messaging.models import Conversation, ConversationParticipant, Message, MessageAttachment
from apps.accounts.models import User
from shared.constants.roles import Role


class UserSummarySerializer(serializers.ModelSerializer):
    headline = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "profile_picture_url", "headline"]

    def get_headline(self, obj):
        if obj.role == Role.CANDIDATE:
            profile = getattr(obj, "candidate_profile", None)
            return profile.headline if profile else "Candidate"
        elif obj.role == Role.RECRUITER:
            # Check company
            company = getattr(obj, "company", None)
            if not company:
                company = obj.administered_companies.first() if hasattr(obj, "administered_companies") else None
            return f"Recruiter at {company.name}" if company else "Recruiter"
        return "Staff"


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation_id",
            "sender",
            "message_type",
            "content",
            "attachments_data",
            "is_read",
            "is_edited",
            "edited_at",
            "is_deleted",
            "created_at",
            "updated_at",
        ]


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    application_context = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "application_id",
            "application_context",
            "participants",
            "other_participant",
            "unread_count",
            "last_message",
            "last_message_at",
            "is_archived",
            "created_at",
            "updated_at",
        ]

    def get_participants(self, obj):
        members = obj.participants.select_related("user").all()
        return [
            {
                "user_id": m.user_id,
                "full_name": m.user.full_name,
                "email": m.user.email,
                "role": m.user.role,
                "profile_picture_url": m.user.profile_picture_url,
                "last_read_at": m.last_read_at,
                "is_active": m.is_active,
                "is_pinned": m.is_pinned,
            }
            for m in members
        ]

    def get_other_participant(self, obj):
        request = self.context.get("request")
        current_user_id = request.user.id if request and request.user.is_authenticated else None

        other_member = obj.participants.exclude(user_id=current_user_id).select_related("user").first()
        if other_member and other_member.user:
            return UserSummarySerializer(other_member.user).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        my_part = obj.participants.filter(user=request.user).first()
        if not my_part:
            return 0
        return obj.messages.filter(
            created_at__gt=my_part.last_read_at
        ).exclude(sender=request.user).count()

    def get_application_context(self, obj):
        if not obj.application:
            return None
        app = obj.application
        job = app.job
        company = job.company
        return {
            "application_id": app.id,
            "job_id": job.id,
            "job_title": job.job_title,
            "company_name": company.name if company else "",
            "company_logo_url": company.logo_url if company else None,
            "application_status": app.application_status,
            "applied_at": app.applied_at,
        }

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "message_type": msg.message_type,
            "has_attachments": bool(msg.attachments_data),
            "created_at": msg.created_at,
            "is_read": msg.is_read,
        }


class CreateConversationSerializer(serializers.Serializer):
    application_id = serializers.IntegerField(required=False, allow_null=True)
    recipient_user_id = serializers.IntegerField(required=False, allow_null=True)


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(required=False, allow_blank=True, default="")
    message_type = serializers.CharField(required=False, default="text")


class EditMessageSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, allow_blank=False)


class ReportChatSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(required=False, allow_null=True)
    reason = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
