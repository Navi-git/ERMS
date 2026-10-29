from datetime import timedelta

import pytest
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import OtpVerification, User

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"
EMAIL = "jane@example.com"


def register(api, email=EMAIL):
    r = api.post(
        reverse("accounts:register"),
        {"email": email, "password": PASSWORD, "role": "candidate", "full_name": "Jane", "accept_terms": True},
        format="json",
    )
    assert r.status_code == 201
    return r


def current_code(email=EMAIL):
    return OtpVerification.objects.filter(destination=email).latest("id").otp_code


def verify(api, code, email=EMAIL):
    return api.post(reverse("accounts:verify-otp"), {"email": email, "code": code}, format="json")


def resend(api, email=EMAIL):
    return api.post(reverse("accounts:resend-otp"), {"email": email}, format="json")


def wrong_code(real):
    return "000000" if real != "000000" else "111111"


class TestVerify:
    def test_correct_code_verifies_user(self, api):
        register(api)
        r = verify(api, current_code())
        assert r.status_code == 200 and r.data["user"]["is_email_verified"] is True
        user = User.objects.get(email=EMAIL)
        assert user.is_email_verified and user.email_verified_at
        assert OtpVerification.objects.get().verified_at is not None

    def test_wrong_code_rejected_and_user_stays_unverified(self, api):
        register(api)
        r = verify(api, wrong_code(current_code()))
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"
        assert User.objects.get().is_email_verified is False

    def test_code_cannot_be_used_twice(self, api):
        register(api)
        code = current_code()
        assert verify(api, code).status_code == 200
        r = verify(api, code)
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"

    def test_expired_code_rejected(self, api):
        register(api)
        code = current_code()
        OtpVerification.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        r = verify(api, code)
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"
        assert User.objects.get().is_email_verified is False

    def test_unknown_email_gets_same_error(self, api):
        r = verify(api, "123456", email="nobody@example.com")
        assert r.status_code == 400 and r.data["code"] == "invalid_otp"

    def test_malformed_code_rejected(self, api):
        register(api)
        assert verify(api, "12ab56").status_code == 400
        assert verify(api, "12345").status_code == 400

    def test_too_many_wrong_attempts_locks_the_code(self, api):
        register(api)
        real = current_code()
        for _ in range(5):
            assert verify(api, wrong_code(real)).status_code == 400
        r = verify(api, real)  # even the correct code is refused now
        assert r.status_code == 429 and r.data["code"] == "otp_attempts_exceeded"
        assert User.objects.get().is_email_verified is False


class TestResend:
    def test_cooldown_blocks_immediate_resend(self, api):
        register(api)
        r = resend(api)
        assert r.status_code == 429 and r.data["code"] == "otp_cooldown"
        assert len(mail.outbox) == 1

    def test_resend_creates_new_code_and_expires_old_one(self, api, settings):
        settings.OTP_RESEND_COOLDOWN_SECONDS = 0
        register(api)
        old = OtpVerification.objects.get()
        assert resend(api).status_code == 200
        old.refresh_from_db()
        assert old.expires_at <= timezone.now()
        assert OtpVerification.objects.count() == 2
        assert len(mail.outbox) == 2 and current_code() in mail.outbox[1].body

    def test_hourly_limit(self, api, settings):
        settings.OTP_RESEND_COOLDOWN_SECONDS = 0
        settings.OTP_MAX_SENDS_PER_HOUR = 2
        register(api)  # send 1
        assert resend(api).status_code == 200  # send 2
        r = resend(api)  # send 3
        assert r.status_code == 429 and r.data["code"] == "otp_rate_limited"

    def test_unknown_email_returns_200_and_sends_nothing(self, api):
        r = resend(api, email="nobody@example.com")
        assert r.status_code == 200
        assert len(mail.outbox) == 0

    def test_verified_user_gets_no_new_code(self, api):
        register(api)
        verify(api, current_code())
        sent_before = len(mail.outbox)
        assert resend(api).status_code == 200
        assert len(mail.outbox) == sent_before
