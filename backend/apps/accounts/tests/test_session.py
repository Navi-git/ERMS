import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.companies.models import Company

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_user(email="jane@example.com", **extra):
    extra.setdefault("full_name", "Jane")
    return User.objects.create_user(email, PASSWORD, is_email_verified=True, **extra)


def login_tokens(api, email="jane@example.com"):
    r = api.post(reverse("accounts:login"), {"email": email, "password": PASSWORD}, format="json")
    assert r.status_code == 200
    return r.data["access"], r.data["refresh"]


def auth(api, access):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


def refresh(api, token):
    api.credentials()  # refresh needs no access token
    return api.post(reverse("accounts:token-refresh"), {"refresh": token}, format="json")


class TestMe:
    def test_requires_token(self, api):
        assert api.get(reverse("accounts:me")).status_code == 401

    def test_returns_current_user(self, api):
        make_user()
        access, _ = login_tokens(api)
        auth(api, access)
        r = api.get(reverse("accounts:me"))
        assert r.status_code == 200 and r.data["email"] == "jane@example.com"

    def test_recruiter_sees_company(self, api):
        user = make_user(role="recruiter")
        Company.objects.create(name="Acme", admin_user=user)
        access, _ = login_tokens(api)
        auth(api, access)
        assert api.get(reverse("accounts:me")).data["company"]["verification_status"] == "PENDING"

    def test_garbage_token_rejected(self, api):
        auth(api, "not-a-token")
        assert api.get(reverse("accounts:me")).status_code == 401

    def test_token_stops_working_when_user_is_suspended(self, api):
        user = make_user()
        access, _ = login_tokens(api)
        User.objects.filter(pk=user.pk).update(suspended_at=timezone.now())
        auth(api, access)
        assert api.get(reverse("accounts:me")).status_code == 401

    def test_token_stops_working_when_user_is_soft_deleted(self, api):
        user = make_user()
        access, _ = login_tokens(api)
        User.objects.filter(pk=user.pk).update(is_active=False)
        auth(api, access)
        assert api.get(reverse("accounts:me")).status_code == 401


class TestRefresh:
    def test_rotates_tokens_and_blacklists_the_old_one(self, api):
        make_user()
        _, old = login_tokens(api)
        r = refresh(api, old)
        assert r.status_code == 200 and r.data["access"] and r.data["refresh"]
        assert r.data["refresh"] != old
        assert refresh(api, old).status_code == 401  # old token is dead
        assert refresh(api, r.data["refresh"]).status_code == 200  # new one works

    def test_garbage_token(self, api):
        assert refresh(api, "nope").status_code == 401

    def test_suspended_user_cannot_refresh(self, api):
        user = make_user()
        _, token = login_tokens(api)
        User.objects.filter(pk=user.pk).update(suspended_at=timezone.now())
        r = refresh(api, token)
        assert r.status_code == 403 and r.data["code"] == "account_suspended"

    def test_soft_deleted_user_cannot_refresh(self, api):
        user = make_user()
        _, token = login_tokens(api)
        User.objects.filter(pk=user.pk).update(is_active=False)
        r = refresh(api, token)
        assert r.status_code == 403 and r.data["code"] == "account_disabled"


class TestLogout:
    def test_logout_blacklists_refresh_token(self, api):
        make_user()
        access, token = login_tokens(api)
        auth(api, access)
        assert api.post(reverse("accounts:logout"), {"refresh": token}, format="json").status_code == 204
        assert refresh(api, token).status_code == 401

    def test_access_token_still_valid_until_expiry(self, api):
        """Documents a known property of JWT: logout cannot revoke the 15-minute access token."""
        make_user()
        access, token = login_tokens(api)
        auth(api, access)
        api.post(reverse("accounts:logout"), {"refresh": token}, format="json")
        assert api.get(reverse("accounts:me")).status_code == 200

    def test_requires_authentication(self, api):
        assert api.post(reverse("accounts:logout"), {"refresh": "x"}, format="json").status_code == 401

    def test_invalid_refresh_token(self, api):
        make_user()
        access, _ = login_tokens(api)
        auth(api, access)
        r = api.post(reverse("accounts:logout"), {"refresh": "nope"}, format="json")
        assert r.status_code == 400 and r.data["code"] == "invalid_token"

    def test_cannot_blacklist_someone_elses_token(self, api):
        make_user("a@example.com")
        make_user("b@example.com")
        access_a, _ = login_tokens(api, "a@example.com")
        _, refresh_b = login_tokens(api, "b@example.com")
        auth(api, access_a)
        r = api.post(reverse("accounts:logout"), {"refresh": refresh_b}, format="json")
        assert r.status_code == 400 and r.data["code"] == "invalid_token"
        assert refresh(api, refresh_b).status_code == 200  # b's session untouched
