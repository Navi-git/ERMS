import re
from datetime import timedelta

import pytest
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User, UserSecurity

pytestmark = pytest.mark.django_db
OLD = "S3cure-Pass!9"
NEW = "Brand-New-Pass#42"
EMAIL = "jane@example.com"


def make_user(email=EMAIL, verified=True, **extra):
    extra.setdefault("full_name", "Jane")
    return User.objects.create_user(email, OLD, is_email_verified=verified, **extra)


def request_reset(api, email=EMAIL):
    return api.post(reverse("accounts:password-reset-request"), {"email": email}, format="json")


def extract_reset_tokens():
    assert len(mail.outbox) > 0
    body = mail.outbox[-1].body
    match = re.search(r"reset-password\?uid=([^\s&]+)&token=([^\s&]+)", body)
    assert match, f"Could not find uid and token in email body: {body}"
    return match.group(1), match.group(2)


def confirm(api, uid, token, password=NEW):
    return api.post(
        reverse("accounts:password-reset-confirm"),
        {"uid": uid, "token": token, "new_password": password},
        format="json",
    )


def login(api, password, email=EMAIL):
    return api.post(reverse("accounts:login"), {"email": email, "password": password}, format="json")


class TestRequest:
    def test_sends_a_reset_code(self, api):
        make_user()
        r = request_reset(api)
        assert r.status_code == 200
        assert len(mail.outbox) == 1
        assert "reset" in mail.outbox[0].subject.lower() and "password" in mail.outbox[0].subject.lower()
        uid, token = extract_reset_tokens()
        assert uid and token

    def test_unknown_email_looks_identical_and_sends_nothing(self, api):
        known = (make_user(), request_reset(api))[1]
        mail.outbox.clear()
        unknown = request_reset(api, email="nobody@example.com")
        assert unknown.status_code == known.status_code == 200 and unknown.data == known.data
        assert len(mail.outbox) == 0

    def test_unverified_and_deleted_users_get_no_code(self, api):
        make_user("u@example.com", verified=False)
        make_user("d@example.com", is_active=False)
        assert request_reset(api, "u@example.com").status_code == 200
        assert request_reset(api, "d@example.com").status_code == 200
        assert len(mail.outbox) == 0

    def test_throttled_request_still_returns_200_without_leaking(self, api):
        make_user()
        request_reset(api)
        r = request_reset(api)  # inside the 60 s cooldown
        assert r.status_code == 200
        assert len(mail.outbox) == 1


class TestConfirm:
    def test_changes_password_and_login_works_with_the_new_one(self, api):
        user = make_user()
        request_reset(api)
        uid, token = extract_reset_tokens()
        r = confirm(api, uid, token)
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.check_password(NEW) and not user.check_password(OLD)
        assert UserSecurity.objects.get(user=user).password_last_changed_at is not None
        assert login(api, NEW).status_code == 200
        assert login(api, OLD).status_code == 401

    def test_code_cannot_be_reused(self, api):
        make_user()
        request_reset(api)
        uid, token = extract_reset_tokens()
        assert confirm(api, uid, token).status_code == 200
        r = confirm(api, uid, token, password="Another-Pass#77")
        assert r.status_code == 400 and r.data["code"] == "invalid_token"

    def test_wrong_code(self, api):
        user = make_user()
        request_reset(api)
        uid, token = extract_reset_tokens()
        r = confirm(api, uid, "invalid-dummy-token")
        assert r.status_code == 400 and r.data["code"] == "invalid_token"
        user.refresh_from_db()
        assert user.check_password(OLD)

    def test_weak_password_is_rejected_without_burning_the_code(self, api):
        make_user()
        request_reset(api)
        uid, token = extract_reset_tokens()
        r = confirm(api, uid, token, password="123")
        assert r.status_code == 400 and "new_password" in r.data
        assert confirm(api, uid, token).status_code == 200  # same token still works


class TestSideEffects:
    def test_reset_unlocks_a_locked_account(self, api):
        make_user()
        for _ in range(5):
            login(api, "Wrong-pass-1!")
        assert login(api, OLD).status_code == 423
        request_reset(api)
        uid, token = extract_reset_tokens()
        assert confirm(api, uid, token).status_code == 200
        assert login(api, NEW).status_code == 200

    def test_reset_revokes_refresh_tokens(self, api):
        make_user()
        refresh = login(api, OLD).data["refresh"]
        request_reset(api)
        uid, token = extract_reset_tokens()
        confirm(api, uid, token)
        r = api.post(reverse("accounts:token-refresh"), {"refresh": refresh}, format="json")
        assert r.status_code == 401

    def test_reset_invalidates_older_access_tokens_but_not_new_ones(self, api):
        user = make_user()
        old = AccessToken.for_user(user)
        old.set_iat(at_time=timezone.now() - timedelta(minutes=5))  # issued before the reset
        request_reset(api)
        uid, token = extract_reset_tokens()
        confirm(api, uid, token)

        api.credentials(HTTP_AUTHORIZATION=f"Bearer {old}")
        assert api.get(reverse("accounts:me")).status_code == 401

        api.credentials()
        fresh = login(api, NEW).data["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {fresh}")
        assert api.get(reverse("accounts:me")).status_code == 200
