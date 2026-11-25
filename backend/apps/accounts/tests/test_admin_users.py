import pytest
from django.urls import reverse

from apps.accounts.models import AuditLog, User, UserSecurity
from apps.companies.models import Company
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_admin(email="superadmin@example.com", **extra):
    extra.setdefault("full_name", "Super Administrator")
    admin = User.objects.create_superuser(email, PASSWORD, **extra)
    UserSecurity.objects.get_or_create(user=admin)
    return admin


def make_candidate(email="candidate@example.com", **extra):
    extra.setdefault("full_name", "Candidate User")
    user = User.objects.create_user(email, PASSWORD, is_email_verified=True, role=Role.CANDIDATE, **extra)
    UserSecurity.objects.get_or_create(user=user)
    return user


def make_recruiter(email="recruiter@example.com", **extra):
    extra.setdefault("full_name", "Recruiter User")
    user = User.objects.create_user(email, PASSWORD, is_email_verified=True, role=Role.RECRUITER, **extra)
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestAdminPermissions:
    def test_anonymous_cannot_access_admin_endpoints(self, api):
        res = api.get(reverse("admin-users:admin-user-list"))
        assert res.status_code == 401

    def test_candidate_cannot_access_admin_endpoints(self, api):
        cand = make_candidate()
        auth_client(api, cand)
        res = api.get(reverse("admin-users:admin-user-list"))
        assert res.status_code == 403

    def test_recruiter_cannot_access_admin_endpoints(self, api):
        recruiter = make_recruiter()
        auth_client(api, recruiter)
        res = api.get(reverse("admin-users:admin-user-list"))
        assert res.status_code == 403


class TestAdminUserList:
    def test_admin_can_list_users_and_view_stats(self, api):
        admin = make_admin()
        make_candidate("c1@example.com")
        make_candidate("c2@example.com")
        make_recruiter("r1@example.com")
        auth_client(api, admin)

        res = api.get(reverse("admin-users:admin-user-list"))
        assert res.status_code == 200
        assert res.data["count"] == 4
        stats = res.data["stats"]
        assert stats["total_users"] == 4
        assert stats["candidates"] == 2
        assert stats["recruiters"] == 1
        assert stats["admins"] == 1

    def test_filter_by_role_and_search(self, api):
        admin = make_admin()
        make_candidate("john.candidate@example.com", full_name="John Doe")
        make_recruiter("jane.recruiter@example.com", full_name="Jane Smith")
        auth_client(api, admin)

        # Filter candidates
        res = api.get(reverse("admin-users:admin-user-list"), {"role": "candidate"})
        assert res.status_code == 200
        assert all(u["role"] == "candidate" for u in res.data["results"])

        # Search by name
        res_search = api.get(reverse("admin-users:admin-user-list"), {"search": "Jane"})
        assert res_search.status_code == 200
        assert len(res_search.data["results"]) == 1
        assert res_search.data["results"][0]["email"] == "jane.recruiter@example.com"


class TestAdminUserDetail:
    def test_get_user_detail_with_company_and_audit(self, api):
        admin = make_admin()
        recruiter = make_recruiter("corp@example.com", full_name="Corp HR")
        Company.objects.create(name="Tech Innovators", admin_user=recruiter)
        auth_client(api, admin)

        res = api.get(reverse("admin-users:admin-user-detail", kwargs={"user_id": recruiter.id}))
        assert res.status_code == 200
        assert res.data["user"]["email"] == "corp@example.com"
        assert res.data["company"]["name"] == "Tech Innovators"
        assert "security" in res.data
        assert "recent_activity" in res.data


class TestAdminSuspendReactivate:
    def test_suspend_user_with_reason(self, api):
        admin = make_admin()
        cand = make_candidate("badactor@example.com")
        auth_client(api, admin)

        res = api.post(
            reverse("admin-users:admin-user-suspend", kwargs={"user_id": cand.id}),
            {"reason": "Terms violation - spamming applications"},
        )
        assert res.status_code == 200

        cand.refresh_from_db()
        assert cand.suspended_at is not None
        assert cand.suspended_by == admin

        # Verify audit log captures reason
        log = AuditLog.objects.filter(entity_type="user", entity_id=cand.id, action="user_suspended").first()
        assert log is not None
        assert log.actor == admin
        assert log.details.get("reason") == "Terms violation - spamming applications"

    def test_reactivate_user(self, api):
        admin = make_admin()
        cand = make_candidate("reformed@example.com")
        auth_client(api, admin)

        # Suspend first
        api.post(reverse("admin-users:admin-user-suspend", kwargs={"user_id": cand.id}), {"reason": "Temp ban"})
        # Reactivate
        res = api.post(reverse("admin-users:admin-user-reactivate", kwargs={"user_id": cand.id}))
        assert res.status_code == 200

        cand.refresh_from_db()
        assert cand.suspended_at is None
        assert AuditLog.objects.filter(entity_type="user", entity_id=cand.id, action="user_reactivated").exists()

    def test_safety_cannot_suspend_self(self, api):
        admin = make_admin()
        auth_client(api, admin)

        res = api.post(
            reverse("admin-users:admin-user-suspend", kwargs={"user_id": admin.id}),
            {"reason": "Attempting suicide"},
        )
        assert res.status_code == 400
        assert res.data["code"] == "cannot_suspend_self"

    def test_safety_cannot_suspend_another_superadmin(self, api):
        admin1 = make_admin("admin1@example.com")
        admin2 = make_admin("admin2@example.com")
        auth_client(api, admin1)

        res = api.post(
            reverse("admin-users:admin-user-suspend", kwargs={"user_id": admin2.id}),
            {"reason": "Rival admin"},
        )
        assert res.status_code == 400
        assert res.data["code"] == "cannot_suspend_superadmin"


class TestAdminSoftDeleteRestore:
    def test_soft_delete_user(self, api):
        admin = make_admin()
        cand = make_candidate("deleteme@example.com")
        auth_client(api, admin)

        res = api.delete(reverse("admin-users:admin-user-detail", kwargs={"user_id": cand.id}))
        assert res.status_code == 200

        cand.refresh_from_db()
        assert cand.is_active is False
        assert AuditLog.objects.filter(entity_type="user", entity_id=cand.id, action="user_soft_deleted").exists()

    def test_restore_user(self, api):
        admin = make_admin()
        cand = make_candidate("restoreme@example.com")
        cand.is_active = False
        cand.save()
        auth_client(api, admin)

        res = api.post(reverse("admin-users:admin-user-restore", kwargs={"user_id": cand.id}))
        assert res.status_code == 200

        cand.refresh_from_db()
        assert cand.is_active is True
        assert AuditLog.objects.filter(entity_type="user", entity_id=cand.id, action="user_restored").exists()

    def test_safety_cannot_delete_self(self, api):
        admin = make_admin()
        auth_client(api, admin)

        res = api.delete(reverse("admin-users:admin-user-detail", kwargs={"user_id": admin.id}))
        assert res.status_code == 400
        assert res.data["code"] == "cannot_delete_self"

    def test_safety_cannot_delete_another_superadmin(self, api):
        admin1 = make_admin("admin1@example.com")
        admin2 = make_admin("admin2@example.com")
        auth_client(api, admin1)

        res = api.delete(reverse("admin-users:admin-user-detail", kwargs={"user_id": admin2.id}))
        assert res.status_code == 400
        assert res.data["code"] == "cannot_delete_superadmin"


class TestAdminCreateSuperAdmin:
    def test_create_super_admin(self, api):
        admin = make_admin("founder@example.com")
        auth_client(api, admin)

        res = api.post(
            reverse("admin-users:admin-user-list"),
            {
                "full_name": "New Admin",
                "email": "newadmin@example.com",
                "password": "N3w-Admin-Pass!99",
            },
        )
        assert res.status_code == 201
        assert res.data["email"] == "newadmin@example.com"
        assert res.data["role"] == "super_admin"

        new_admin = User.objects.get(email="newadmin@example.com")
        assert new_admin.role == Role.SUPER_ADMIN
        assert AuditLog.objects.filter(action="superadmin_created", entity_id=new_admin.id).exists()

