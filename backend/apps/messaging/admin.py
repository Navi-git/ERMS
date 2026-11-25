from django.contrib import admin
from .models import Conversation, ConversationParticipant, Message, MessageAttachment


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "application", "created_by", "last_message_at", "created_at")
    search_fields = ("id", "created_by__email")


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "user", "last_read_at", "is_active", "is_pinned")
    search_fields = ("user__email", "conversation__id")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "message_type", "is_read", "is_deleted", "created_at")
    search_fields = ("content", "sender__email")


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "file_name", "file_size", "mime_type", "created_at")
