import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.notifications.models import Broadcast, BroadcastAudience, Notification, NotificationType
from apps.notifications.services import notification_service
from shared.constants.roles import Role


@pytest.fixture
def candidate_user(db):
    user = User.objects.create(
        email="candidate.notif@example.com",
        role=Role.CANDIDATE,
        full_name="Alex Candidate",
        is_email_verified=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def recruiter_user(db):
    user = User.objects.create(
        email="recruiter.notif@example.com",
        role=Role.RECRUITER,
        full_name="Sarah Recruiter",
        is_email_verified=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def admin_user(db):
    user = User.objects.create(
        email="admin.notif@example.com",
        role=Role.SUPER_ADMIN,
        full_name="Master Admin",
        is_email_verified=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.mark.django_db
def test_create_notification_and_unread_count(candidate_user):
    notif = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.APPLICATION_STATUS_CHANGED,
        title="Application Shortlisted",
        message="You have been moved to the interview round.",
        redirect_url="/candidate/applications/12",
        source_type="application",
        source_id=12,
    )

    assert notif.id is not None
    assert notif.is_read is False
    assert notif.redirect_url == "/candidate/applications/12"
    assert notification_service._get_unread_count(candidate_user) == 1


@pytest.mark.django_db
def test_sanitize_redirect_url(candidate_user):
    # Reject absolute URLs to prevent open-redirect vulnerabilities
    notif = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.SYSTEM,
        title="Security Alert",
        message="Check settings",
        redirect_url="https://malicious-site.com/evil",
    )
    assert notif.redirect_url is None

    # Accept relative path
    notif2 = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.SYSTEM,
        title="Security Alert 2",
        message="Check settings",
        redirect_url="/settings",
    )
    assert notif2.redirect_url == "/settings"


@pytest.mark.django_db
def test_mark_as_read(candidate_user):
    notif = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.APPLICATION_STATUS_CHANGED,
        title="Application Shortlisted",
        message="You have been moved to the interview round.",
    )
    assert notif.is_read is False

    notification_service.mark_as_read(notif.id, candidate_user)
    notif.refresh_from_db()

    assert notif.is_read is True
    assert notif.read_at is not None
    assert notification_service._get_unread_count(candidate_user) == 0


@pytest.mark.django_db
def test_mark_all_as_read(candidate_user):
    for i in range(3):
        notification_service.notify(
            user=candidate_user,
            notification_type=NotificationType.SYSTEM,
            title=f"Notification {i}",
            message=f"Message {i}",
        )

    assert notification_service._get_unread_count(candidate_user) == 3

    notification_service.mark_all_as_read(candidate_user)
    assert notification_service._get_unread_count(candidate_user) == 0


@pytest.mark.django_db
def test_admin_broadcast(admin_user, candidate_user, recruiter_user):
    broadcast = notification_service.broadcast(
        title="Scheduled Maintenance",
        message="Platform downtime tonight at 2 AM.",
        audience=BroadcastAudience.ALL,
        created_by=admin_user,
        notification_type="system",
        redirect_url="/help",
    )

    assert broadcast.id is not None
    assert broadcast.recipient_count >= 3
    assert Notification.objects.filter(source_type="broadcast", source_id=broadcast.id).count() >= 3


@pytest.mark.django_db
def test_api_notification_list_and_filters(api, candidate_user):
    api.force_authenticate(user=candidate_user)

    notif1 = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.APPLICATION_STATUS_CHANGED,
        title="App Updated",
        message="Msg 1",
    )
    notif2 = notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.MESSAGE_RECEIVED,
        title="Chat Received",
        message="Msg 2",
    )
    notification_service.mark_as_read(notif1.id, candidate_user)

    # 1. Fetch all
    res = api.get("/api/v1/notifications/")
    assert res.status_code == 200
    assert res.data["count"] == 2

    # 2. Filter unread
    res_unread = api.get("/api/v1/notifications/?unread=true")
    assert res_unread.status_code == 200
    assert res_unread.data["count"] == 1
    assert res_unread.data["results"][0]["id"] == notif2.id

    # 3. Filter category: messages
    res_cat = api.get("/api/v1/notifications/?category=messages")
    assert res_cat.status_code == 200
    assert res_cat.data["count"] == 1
    assert res_cat.data["results"][0]["id"] == notif2.id

    # 4. Unread count endpoint
    res_count = api.get("/api/v1/notifications/unread-count/")
    assert res_count.status_code == 200
    assert res_count.data["unread_count"] == 1

    # 5. Mark read endpoint
    res_read = api.post(f"/api/v1/notifications/{notif2.id}/read/")
    assert res_read.status_code == 200
    assert res_read.data["unread_count"] == 0

    # 6. Mark all read endpoint
    notification_service.notify(
        user=candidate_user,
        notification_type=NotificationType.SYSTEM,
        title="New System Notice",
        message="Notice text",
    )
    res_read_all = api.post("/api/v1/notifications/read-all/")
    assert res_read_all.status_code == 200
    assert res_read_all.data["unread_count"] == 0


@pytest.mark.django_db
def test_admin_broadcast_api(api, admin_user, candidate_user):
    # Non-admin cannot post broadcast
    api.force_authenticate(user=candidate_user)
    res_forbidden = api.post(
        "/api/v1/notifications/admin/broadcasts/",
        {"title": "Test", "message": "Test Msg", "audience": "all"},
    )
    assert res_forbidden.status_code == 403

    # Super Admin can post broadcast
    api.force_authenticate(user=admin_user)
    res_create = api.post(
        "/api/v1/notifications/admin/broadcasts/",
        {
            "title": "Platform Update v2",
            "message": "We have launched new features!",
            "audience": "candidates",
            "notification_type": "system",
        },
    )
    assert res_create.status_code == 201
    assert res_create.data["title"] == "Platform Update v2"

    # Super Admin can list broadcasts and view delivery metrics
    res_list = api.get("/api/v1/notifications/admin/broadcasts/")
    assert res_list.status_code == 200
    assert "metrics" in res_list.data
    assert res_list.data["metrics"]["total_sent_today"] >= 1
    assert len(res_list.data["results"]) >= 1
