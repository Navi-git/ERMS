from django.urls import path
from apps.messaging.views import (
    ConversationListCreateView,
    ConversationDetailView,
    ConversationMessagesView,
    MessageDetailView,
    ConversationReadView,
    GlobalUnreadCountView,
    ReportChatView,
    ConversationAttachmentDownloadView,
)

urlpatterns = [
    path("", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("<int:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("<int:pk>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
    path("<int:pk>/messages/<int:mid>/", MessageDetailView.as_view(), name="message-detail"),
    path("<int:pk>/attachments/<int:att_id>/", ConversationAttachmentDownloadView.as_view(), name="conversation-attachment-download"),
    path("<int:pk>/read/", ConversationReadView.as_view(), name="conversation-read"),
    path("<int:pk>/report/", ReportChatView.as_view(), name="conversation-report"),
    path("unread-count/", GlobalUnreadCountView.as_view(), name="global-unread-count"),
]
