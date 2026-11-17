from django.urls import path
from .views import (
    AdminBroadcastListView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
)

urlpatterns = [
    # Personal notifications
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    # Admin endpoints
    path("admin/broadcasts/", AdminBroadcastListView.as_view(), name="admin-broadcasts"),
]