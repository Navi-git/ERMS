from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User, UserSecurity
from apps.companies.models import Company

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"
EMAIL = "jane@example.com"


def make_user(email=EMAIL, verified=True, **extra):
    extra.setdefault("full_name", "Jane")
    return User.objects.create_user(email, PASSWORD, is_email_verified=verified, **extra)


def login(api, password=PASSWORD, email=EMAIL):
    return api.post(reverse("accounts:login"), {"email": email, "password": password}, format="json")


class TestLoginSuccess:
    def test_returns_tokens_and_user(self, api):
        user = make_user()
        r = login(api)
        assert r.status_code == 200
        assert r.data["access"] and r.data["refresh"]
        assert r.data["user"]["email"] == EMAIL and r.data["user"]["role"] == "candidate"
        assert "password" not in r.data["user"]
        assert r.data["user"]["company"] is None
        user.refresh_from_db()
        assert user.last_login_at is not None

    def test_email_is_case_insensitive(self, api):
        make_user()
        assert login(api, email="JANE@Example.COM").status_code == 200

    def test_recruiter_gets_company_verification_status(self, api):
        user = make_user(role="recruiter")
        Company.objects.create(name="Acme", admin_user=user)
        r = login(api)
        assert r.data["user"]["company"]["name"] == "Acme"
        assert r.data["user"]["company"]["verification_status"] == "PENDING"

    def test_superuser_without_security_row_can_login(self, api):
        User.objects.create_superuser("root@example.com", PASSWORD, full_name="Root")
        assert not UserSecurity.objects.exists()
        r = login(api, email="root@example.com")
        assert r.status_code == 200 and r.data["user"]["role"] == "super_admin"
        assert UserSecurity.objects.count() == 1


class TestLoginFailure:
    def test_wrong_password_and_unknown_email_look_identical(self, api):
        make_user()
        wrong = login(api, password="Wrong-pass-1!")
        unknown = login(api, email="nobody@example.com")
        assert wrong.status_code == unknown.status_code == 401
        assert wrong.data == unknown.data and wrong.data["code"] == "invalid_credentials"

    def test_failed_attempt_is_counted(self, api):
        user = make_user()
        login(api, password="Wrong-pass-1!")
        assert UserSecurity.objects.get(user=user).failed_login_count == 1

    def test_success_resets_counter(self, api):
        user = make_user()
        login(api, password="Wrong-pass-1!")
        login(api, password="Wrong-pass-1!")
        assert login(api).status_code == 200
        assert UserSecurity.objects.get(user=user).failed_login_count == 0

    def test_missing_fields(self, api):
        assert api.post(reverse("accounts:login"), {}, format="json").status_code == 400


class TestLockout:
    def test_five_failures_lock_the_account_even_for_correct_password(self, api):
        user = make_user()
        for _ in range(5):
            assert login(api, password="Wrong-pass-1!").status_code == 401
        sec = UserSecurity.objects.get(user=user)
        assert sec.failed_login_count == 5 and sec.locked_until is not None
        r = login(api)  # correct password, but locked
        assert r.status_code == 423 and r.data["code"] == "account_locked"

    def test_lock_expires(self, api):
        user = make_user()
        for _ in range(5):
            login(api, password="Wrong-pass-1!")
        UserSecurity.objects.filter(user=user).update(locked_until=timezone.now() - timedelta(seconds=1))
        assert login(api).status_code == 200
        sec = UserSecurity.objects.get(user=user)
        assert sec.failed_login_count == 0 and sec.locked_until is None


class TestAccountState:
    def test_unverified_email(self, api):
        make_user(verified=False)
        r = login(api)
        assert r.status_code == 403 and r.data["code"] == "email_not_verified"
        assert "access" not in r.data

    def test_suspended_user(self, api):
        make_user(suspended_at=timezone.now())
        r = login(api)
        assert r.status_code == 403 and r.data["code"] == "account_suspended"

    def test_soft_deleted_user(self, api):
        make_user(is_active=False)
        r = login(api)
        assert r.status_code == 403 and r.data["code"] == "account_disabled"

    def test_state_is_not_revealed_without_the_right_password(self, api):
        make_user(suspended_at=timezone.now())
        r = login(api, password="Wrong-pass-1!")
        assert r.status_code == 401 and r.data["code"] == "invalid_credentials"
