import os
import mimetypes
from django.db import models
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

from apps.messaging.models import Conversation, ConversationParticipant, Message, MessageAttachment
from apps.messaging.serializers import (
    ConversationDetailSerializer,
    MessageSerializer,
    CreateConversationSerializer,
    SendMessageSerializer,
    EditMessageSerializer,
    ReportChatSerializer,
)
from apps.messaging.services import MessagingService


class ConversationListCreateView(APIView):
    """
    GET /api/v1/conversations/ - List user's active conversations.
    POST /api/v1/conversations/ - Start or get existing conversation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_query = request.query_params.get("search", "").strip()

        qs = Conversation.objects.filter(
            participants__user=request.user,
            participants__is_active=True,
        ).select_related(
            "application", "application__job", "application__job__company"
        ).prefetch_related(
            "participants__user",
            "messages",
        ).distinct()

        if search_query:
            qs = qs.filter(
                models.Q(participants__user__full_name__icontains=search_query)
                | models.Q(application__job__job_title__icontains=search_query)
                | models.Q(application__job__company__name__icontains=search_query)
            )

        serializer = ConversationDetailSerializer(qs, many=True, context={"request": request})
        return Response({"conversations": serializer.data, "total": len(serializer.data)})

    def post(self, request):
        serializer = CreateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        app_id = serializer.validated_data.get("application_id")
        recipient_id = serializer.validated_data.get("recipient_user_id")

        conv = MessagingService.get_or_create_conversation(
            user=request.user,
            application_id=app_id,
            recipient_user_id=recipient_id,
        )

        detail_serializer = ConversationDetailSerializer(conv, context={"request": request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    """
    GET /api/v1/conversations/<id>/ - Conversation header and metadata.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = Conversation.objects.select_related(
                "application", "application__job", "application__job__company"
            ).prefetch_related(
                "participants__user",
                "messages",
            ).get(id=pk, participants__user=request.user, participants__is_active=True)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConversationDetailSerializer(conv, context={"request": request})
        return Response(serializer.data)


class ConversationMessagesView(APIView):
    """
    GET /api/v1/conversations/<id>/messages/ - Paginated message history.
    POST /api/v1/conversations/<id>/messages/ - Send a new message (text/attachments).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        # Verify access
        if not ConversationParticipant.objects.filter(conversation_id=pk, user=request.user, is_active=True).exists():
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        before_id = request.query_params.get("before")
        limit = min(int(request.query_params.get("limit", 40)), 100)

        qs = Message.objects.filter(conversation_id=pk).select_related("sender")

        if before_id:
            try:
                qs = qs.filter(id__lt=int(before_id))
            except ValueError:
                pass

        # Order descending to take top N most recent before cursor, then reverse for chronological display
        recent_messages = list(qs.order_by("-id")[:limit])
        recent_messages.reverse()

        serializer = MessageSerializer(recent_messages, many=True)
        has_more = len(recent_messages) == limit

        # Optional mark read during fetch
        if request.query_params.get("mark_read", "false").lower() in ("1", "true"):
            MessagingService.mark_conversation_read(request.user, pk)

        return Response({
            "messages": serializer.data,
            "has_more": has_more,
            "next_cursor": recent_messages[0].id if recent_messages and has_more else None,
        })

    def post(self, request, pk):
        content = request.data.get("content", "")
        message_type = request.data.get("message_type", "text")
        files = request.FILES.getlist("files")

        msg = MessagingService.send_message(
            user=request.user,
            conversation_id=pk,
            content=content,
            message_type=message_type,
            files=files,
        )

        serializer = MessageSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """
    PATCH /api/v1/conversations/<id>/messages/<mid>/ - Edit message (15m window).
    DELETE /api/v1/conversations/<id>/messages/<mid>/ - Soft delete message.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, mid):
        serializer = EditMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        msg = MessagingService.edit_message(
            user=request.user,
            conversation_id=pk,
            message_id=mid,
            new_content=serializer.validated_data["content"],
        )
        return Response(MessageSerializer(msg).data)

    def delete(self, request, pk, mid):
        MessagingService.delete_message(
            user=request.user,
            conversation_id=pk,
            message_id=mid,
        )
        return Response({"message": "Message deleted successfully."})


class ConversationReadView(APIView):
    """
    POST /api/v1/conversations/<id>/read/ - Mark all messages in conversation as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        result = MessagingService.mark_conversation_read(request.user, pk)
        return Response(result)


class GlobalUnreadCountView(APIView):
    """
    GET /api/v1/messaging/unread-count/ - Global unread conversations count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = MessagingService.get_user_unread_count(request.user)
        return Response({"unread_count": count})


class ReportChatView(APIView):
    """
    POST /api/v1/conversations/<id>/report/ - Report message or entire conversation to super admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = ReportChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report = MessagingService.report_chat(
            reporter=request.user,
            conversation_id=pk,
            message_id=serializer.validated_data.get("message_id"),
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data.get("description", ""),
        )

        return Response({
            "message": "Report submitted successfully for admin review.",
            "report_id": report.id,
            "status": report.status,
        }, status=status.HTTP_201_CREATED)


class ConversationAttachmentDownloadView(APIView):
    """
    GET /api/v1/conversations/<pk>/attachments/<att_id>/ - View or download attachment.
    Supports either Bearer token header OR query param ?token=... for iframe preview.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk, att_id):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get("token")
            if token:
                User = get_user_model()
                try:
                    access_token = AccessToken(token)
                    user_id = access_token.get("user_id")
                    user = User.objects.get(id=user_id, is_active=True)
                except Exception:
                    user = None

        if not user or not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verify participant
        is_member = ConversationParticipant.objects.filter(
            conversation_id=pk, user=user, is_active=True
        ).exists() or getattr(user, "is_superuser", False)

        if not is_member:
            return Response(
                {"detail": "Permission denied. You are not a participant in this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            att = MessageAttachment.objects.select_related("message").get(
                id=att_id, message__conversation_id=pk
            )
        except MessageAttachment.DoesNotExist:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not att.file or not os.path.exists(att.file.path):
            return Response({"detail": "File not found on server storage."}, status=status.HTTP_404_NOT_FOUND)

        is_download = request.query_params.get("download") == "1"
        disposition = "attachment" if is_download else "inline"

        content_type = att.mime_type
        if not content_type or content_type == "application/octet-stream":
            guessed, _ = mimetypes.guess_type(att.file_name)
            content_type = guessed or "application/octet-stream"

        response = FileResponse(open(att.file.path, "rb"), content_type=content_type)
        response["Content-Disposition"] = f'{disposition}; filename="{att.file_name}"'
        response["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
