from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from apps.notifications.models import Broadcast, BroadcastAudience, Notification, NotificationType
from apps.notifications.serializers import NotificationSerializer
from shared.constants.roles import Role

User = get_user_model()


def _sanitize_redirect_url(url):
    """Ensures redirect_url is strictly a relative frontend path."""
    if not url:
        return None
    url = url.strip()
    if url.startswith("/") and not url.startswith("//"):
        return url
    return None


def _get_unread_count(user):
    return Notification.objects.filter(user=user, is_read=False).count()


def _push_ws_notification(user, notification, extra=None):
    """Pushes notification payload to user's WebSocket channel group."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        unread_count = _get_unread_count(user)
        serialized_data = NotificationSerializer(notification).data
        if extra:
            serialized_data["extra"] = extra
        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                "type": "notification.alert",
                "data": serialized_data,
                "unread_count": unread_count,
            },
        )
    except Exception:
        pass


def notify(user, notification_type, title, message, redirect_url=None, source_type="", source_id=None, extra=None):
    """Creates a notification and dispatches via WebSocket after transaction commits."""
    safe_url = _sanitize_redirect_url(redirect_url)
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        redirect_url=safe_url,
        source_type=source_type,
        source_id=source_id,
        sent_at=timezone.now(),
        delivered_at=timezone.now(),
    )

    transaction.on_commit(lambda: _push_ws_notification(user, notification, extra=extra))
    return notification


def notify_many(users, notification_type, title, message, redirect_url=None, source_type="", source_id=None):
    """Bulk creates notifications for multiple users and pushes real-time events."""
    safe_url = _sanitize_redirect_url(redirect_url)
    now = timezone.now()
    records = [
        Notification(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            redirect_url=safe_url,
            source_type=source_type,
            source_id=source_id,
            sent_at=now,
            delivered_at=now,
        )
        for user in users
    ]
    created = Notification.objects.bulk_create(records)

    def dispatch_all():
        for item in created:
            _push_ws_notification(item.user, item)

    transaction.on_commit(dispatch_all)
    return created


def notify_company_recruiter(company, notification_type, title, message, redirect_url=None, source_type="", source_id=None):
    """Sends notification to the recruiter(s) linked to a company."""
    recruiters = company.recruiters.filter(user__is_active=True).select_related("user")
    for r in recruiters:
        notify(
            user=r.user,
            notification_type=notification_type,
            title=title,
            message=message,
            redirect_url=redirect_url,
            source_type=source_type,
            source_id=source_id,
        )


def broadcast(title, message, audience="all", created_by=None, notification_type="system", redirect_url=None):
    """Admin broadcast creation: saves Broadcast record and bulk notifies recipients."""
    safe_url = _sanitize_redirect_url(redirect_url)
    
    # 1. Filter target audience: strictly candidates and recruiters (never super_admins)
    if audience == BroadcastAudience.CANDIDATES:
        recipients = list(User.objects.filter(is_active=True, role=Role.CANDIDATE))
    elif audience == BroadcastAudience.RECRUITERS:
        recipients = list(User.objects.filter(is_active=True, role=Role.RECRUITER))
    else:
        # Target candidates and recruiters across the platform
        recipients = list(User.objects.filter(is_active=True, role__in=[Role.CANDIDATE, Role.RECRUITER]))

    # Exclude the sender/creator and any super admin from receiving the broadcast as a personal notification
    created_by_id = getattr(created_by, "id", None)
    recipients = [
        u for u in recipients 
        if (created_by_id is None or u.id != created_by_id) and u.role != Role.SUPER_ADMIN
    ]

    # 2. Create Broadcast log
    broadcast_log = Broadcast.objects.create(
        title=title,
        message=message,
        audience=audience,
        notification_type=notification_type,
        created_by=created_by,
        recipient_count=len(recipients),
    )

    # 3. Bulk create Notification entries
    now = timezone.now()
    notifications = [
        Notification(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            redirect_url=safe_url,
            source_type="broadcast",
            source_id=broadcast_log.id,
            sent_at=now,
            delivered_at=now,
        )
        for user in recipients
    ]
    created = Notification.objects.bulk_create(notifications)

    # 4. Dispatch WebSocket events to each recipient and admin channels
    def dispatch_broadcast():
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return

            for item in created:
                _push_ws_notification(item.user, item)

            from apps.notifications.serializers import BroadcastSerializer
            broadcast_data = BroadcastSerializer(broadcast_log).data
            async_to_sync(channel_layer.group_send)(
                "broadcast_admins",
                {
                    "type": "broadcast.alert",
                    "data": broadcast_data,
                },
            )
        except Exception:
            pass

    transaction.on_commit(dispatch_broadcast)
    return broadcast_log


def mark_as_read(notification_id, user):
    """Marks a single notification as read."""
    updated = Notification.objects.filter(id=notification_id, user=user, is_read=False).update(
        is_read=True, read_at=timezone.now()
    )
    unread_count = _get_unread_count(user)
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "unread_count.update",
                    "unread_count": unread_count,
                    "notification_id": notification_id,
                },
            )
    except Exception:
        pass
    return unread_count


def mark_all_as_read(user):
    """Marks all unread notifications for user as read."""
    Notification.objects.filter(user=user, is_read=False).update(
        is_read=True, read_at=timezone.now()
    )
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "unread_count.update",
                    "unread_count": 0,
                },
            )
    except Exception:
        pass
    return 0