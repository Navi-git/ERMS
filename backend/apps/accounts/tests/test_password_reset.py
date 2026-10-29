from datetime import timedelta

import pytest
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import OtpVerification, User, UserSecurity
from shared.constants.auth import OtpPurpose

pytestmark = pytest.mark.django_db
OLD = "S3cure-Pass!9"
NEW = "Brand-New-Pass#42"
EMAIL = "jane@example.com"


def make_user(email=EMAIL, verified=True, **extra):
    extra.setdefault("full_name", "Jane")
    return User.objects.create_user(email, OLD, is_email_verified=verified, **extra)


def request_reset(api, email=EMAIL):
    return api.post(reverse("accounts:password-reset-request"), {"email": email}, format="json")


def confirm(api, code, password=NEW, email=EMAIL):
    return api.post(
        reverse("accounts:password-reset-confirm"),
        {"email": email, "code": code, "new_password": password},
        format="json",
    )


def reset_code(email=EMAIL):
    return OtpVerification.objects.filter(destination=email, purpose=OtpPurpose.PASSWORD_RESET).latest("id").otp_code


def login(api, password, email=EMAIL):
    return api.post(reverse("accounts:login"), {"email": email, "password": password}, format="json")


def wrong(code):
    return "000000" if code != "000000" else "111111"


class TestRequest:
    def test_sends_a_reset_code(self, api):
        make_user()
        r = request_reset(api)
        assert r.status_code == 200
        otp = OtpVerification.objects.get()
        assert otp.purpose == OtpPurpose.PASSWORD_RESET and otp.destination == EMAIL
        assert len(mail.outbox) == 1
        assert "password reset" in mail.outbox[0].subject.lower() and otp.otp_code in mail.outbox[0].body

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
        assert len(mail.outbox) == 0 and not OtpVerification.objects.exists()

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
        r = confirm(api, reset_code())
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.check_password(NEW) and not user.check_password(OLD)
        assert OtpVerification.objects.get().verified_at is not None
        assert UserSecurity.objects.get(user=user).password_last_changed_at is not None
        assert login(api, NEW).status_code == 200
        assert login(api, OLD).status_code == 401

    def test_code_cannot_be_reused(self, api):
        make_user()
        request_reset(api)
        code = reset_code()
        assert confirm(api, code).status_code == 200
        r = confirm(api, code, password="Another-Pass#77")
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"

    def test_wrong_code(self, api):
        user = make_user()
        request_reset(api)
        r = confirm(api, wrong(reset_code()))
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"
        user.refresh_from_db()
        assert user.check_password(OLD)

    def test_weak_password_is_rejected_without_burning_the_code(self, api):
        make_user()
        request_reset(api)
        code = reset_code()
        r = confirm(api, code, password="12345678")
        assert r.status_code == 400 and "new_password" in r.data
        assert OtpVerification.objects.get().verified_at is None
        assert confirm(api, code).status_code == 200  # same code still works

    def test_expired_code(self, api):
        make_user()
        request_reset(api)
        code = reset_code()
        OtpVerification.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        assert confirm(api, code).status_code == 400

    def test_too_many_wrong_attempts(self, api):
        make_user()
        request_reset(api)
        real = reset_code()
        for _ in range(5):
            assert confirm(api, wrong(real)).status_code == 400
        r = confirm(api, real)
        assert r.status_code == 429 and r.data["code"] == "otp_attempts_exceeded"

    def test_email_verification_code_cannot_reset_a_password(self, api):
        user = make_user()
        OtpVerification.objects.create(
            user=user, destination=EMAIL, purpose=OtpPurpose.EMAIL_VERIFICATION,
            otp_code="123456", expires_at=timezone.now() + timedelta(minutes=5),
        )
        r = confirm(api, "123456")
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"
        user.refresh_from_db()
        assert user.check_password(OLD)

    def test_deleted_user_cannot_reset(self, api):
        user = make_user(is_active=False)
        OtpVerification.objects.create(
            user=user, destination=EMAIL, purpose=OtpPurpose.PASSWORD_RESET,
            otp_code="123456", expires_at=timezone.now() + timedelta(minutes=5),
        )
        assert confirm(api, "123456").status_code == 400
        user.refresh_from_db()
        assert user.check_password(OLD)


class TestSideEffects:
    def test_reset_unlocks_a_locked_account(self, api):
        make_user()
        for _ in range(5):
            login(api, "Wrong-pass-1!")
        assert login(api, OLD).status_code == 423
        request_reset(api)
        assert confirm(api, reset_code()).status_code == 200
        assert login(api, NEW).status_code == 200

    def test_reset_revokes_refresh_tokens(self, api):
        make_user()
        refresh = login(api, OLD).data["refresh"]
        request_reset(api)
        confirm(api, reset_code())
        r = api.post(reverse("accounts:token-refresh"), {"refresh": refresh}, format="json")
        assert r.status_code == 401

    def test_reset_invalidates_older_access_tokens_but_not_new_ones(self, api):
        user = make_user()
        old = AccessToken.for_user(user)
        old.set_iat(at_time=timezone.now() - timedelta(minutes=5))  # issued before the reset
        request_reset(api)
        confirm(api, reset_code())

        api.credentials(HTTP_AUTHORIZATION=f"Bearer {old}")
        assert api.get(reverse("accounts:me")).status_code == 401

        api.credentials()
        fresh = login(api, NEW).data["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {fresh}")
        assert api.get(reverse("accounts:me")).status_code == 200
