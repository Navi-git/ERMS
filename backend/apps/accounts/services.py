"""Business rules for registration and email OTP.

Rules live here (not in views) so they can be tested and reused without HTTP.
Where data lives:
  - PostgreSQL `otp_verifications`: every OTP issued/verified (the ERD record).
  - Cache / Redis: short-lived counters only (resend cooldown, hourly send limit, wrong attempts).
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.companies.models import Company
from shared.constants.auth import AuthProvider, OtpPurpose
from shared.constants.roles import Role
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from shared.exceptions.api import ApiError

from . import google_auth
from .models import AuthIdentity, OtpVerification, User, UserSecurity


def _incr(key, timeout):
    """Atomic-ish counter that works with both Redis and the local-memory cache."""
    cache.add(key, 0, timeout=timeout)
    try:
        return cache.incr(key)
    except ValueError:  # key expired between add() and incr()
        cache.set(key, 1, timeout=timeout)
        return 1


def _enforce_send_limits(email, purpose):
    cooldown_key = f"otp:cooldown:{purpose}:{email}"
    if cache.get(cooldown_key):
        raise ApiError("otp_cooldown", "Please wait before requesting another code.", 429)
    if _incr(f"otp:sends:{purpose}:{email}", timeout=3600) > settings.OTP_MAX_SENDS_PER_HOUR:
        raise ApiError("otp_rate_limited", "Too many codes requested. Try again later.", 429)
    cache.set(cooldown_key, 1, timeout=settings.OTP_RESEND_COOLDOWN_SECONDS)


def issue_otp(*, user, email, purpose):
    """Create a new OTP row, expire older unused ones, and email the code."""
    _enforce_send_limits(email, purpose)
    now = timezone.now()
    OtpVerification.objects.filter(
        destination=email, purpose=purpose, verified_at__isnull=True, expires_at__gt=now
    ).update(expires_at=now)  # only the newest code stays valid

    length = settings.OTP_LENGTH
    code = f"{secrets.randbelow(10 ** length):0{length}d}"
    otp = OtpVerification.objects.create(
        user=user,
        destination=email,
        purpose=purpose,
        otp_code=code,
        expires_at=now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
    )
    if purpose == OtpPurpose.PASSWORD_RESET:
        subject, what = "Your ERMS password reset code", "password reset code"
    else:
        subject, what = "Your ERMS verification code", "verification code"
    send_mail(
        subject,
        f"Your ERMS {what} is {code}. It expires in "
        f"{settings.OTP_EXPIRY_MINUTES} minutes. If you did not request it, ignore this email.",
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return otp


def register_user(*, email, password, role, full_name=None, company_name=None):
    """Create user + user_security (+ company for recruiters) + OTP in ONE transaction.

    If anything fails (including sending the email) everything is rolled back.
    """
    email = email.strip().lower()
    existing = User.objects.filter(email=email).first()
    if existing:
        if existing.is_email_verified:
            raise ApiError("email_already_registered", "An account with this email already exists.", 409)
        raise ApiError(
            "email_not_verified",
            "This email is registered but not verified. Request a new code to continue.",
            409,
        )

    try:
        with transaction.atomic():
            now = timezone.now()
            user = User.objects.create_user(
                email,
                password,
                role=role,
                full_name=full_name or company_name,  # recruiters default to the company name
                terms_accepted_at=now,
                terms_version=settings.TERMS_VERSION,
                privacy_accepted_at=now,
                privacy_version=settings.PRIVACY_VERSION,
            )
            UserSecurity.objects.create(user=user, password_last_changed_at=now)
            if role == Role.RECRUITER:
                Company.objects.create(name=company_name, admin_user=user)  # verification_status=PENDING
            issue_otp(user=user, email=email, purpose=OtpPurpose.EMAIL_VERIFICATION)
    except IntegrityError:  # two requests raced past the exists() check
        raise ApiError("email_already_registered", "An account with this email already exists.", 409)
    return user


def _consume_otp(*, email, purpose, code):
    """Check a code and mark it used. Call inside transaction.atomic().

    Wrong, unknown, used and expired codes all raise the same `invalid_otp`, and wrong
    guesses are counted in the cache so a code can only be tried OTP_MAX_ATTEMPTS times.
    """
    now = timezone.now()
    otp = (
        OtpVerification.objects.select_for_update()
        .filter(destination=email, purpose=purpose, verified_at__isnull=True, expires_at__gt=now)
        .order_by("-created_at", "-id")
        .first()
    )
    if otp is None or otp.user is None:
        raise ApiError("invalid_otp", "Invalid or expired code.")

    attempts_key = f"otp:attempts:{otp.id}"
    if (cache.get(attempts_key) or 0) >= settings.OTP_MAX_ATTEMPTS:
        raise ApiError("otp_attempts_exceeded", "Too many incorrect attempts. Request a new code.", 429)
    if not secrets.compare_digest(otp.otp_code, code):
        _incr(attempts_key, timeout=settings.OTP_EXPIRY_MINUTES * 60)
        raise ApiError("invalid_otp", "Invalid or expired code.")

    otp.verified_at = now
    otp.save(update_fields=["verified_at"])
    return otp


def verify_email_otp(*, email, code):
    email = email.strip().lower()
    now = timezone.now()
    with transaction.atomic():
        otp = _consume_otp(email=email, purpose=OtpPurpose.EMAIL_VERIFICATION, code=code)
        user = otp.user
        user.is_email_verified = True
        user.email_verified_at = now
        user.save(update_fields=["is_email_verified", "email_verified_at", "updated_at"])
    cache.delete(f"otp:attempts:{otp.id}")
    return user


def resend_email_otp(*, email):
    """Silently does nothing for unknown/verified emails, so the endpoint cannot be used to probe accounts."""
    email = email.strip().lower()
    user = User.objects.filter(email=email, is_email_verified=False, is_active=True).first()
    if user is None:
        return
    issue_otp(user=user, email=email, purpose=OtpPurpose.EMAIL_VERIFICATION)


# ---------------------------------------------------------------------------
# Login / logout
# ---------------------------------------------------------------------------
def login(*, email, password):
    """Check credentials with lockout, then issue JWTs.

    Order matters: password first, account state second, so only the real owner of an
    account can learn that it is blocked, deleted or unverified.
    """
    email = email.strip().lower()
    user = User.objects.filter(email=email).first()
    if user is None:
        make_password(password)  # spend the same time as a real check (timing side channel)
        raise ApiError("invalid_credentials", "Incorrect email or password.", 401)

    now = timezone.now()
    outcome = "ok"
    # The counters are saved INSIDE the transaction, and errors are raised AFTER it:
    # raising inside would roll the failed-attempt count back.
    with transaction.atomic():
        security, _ = UserSecurity.objects.select_for_update().get_or_create(user=user)
        if security.locked_until and security.locked_until > now:
            outcome = "locked"
        else:
            if security.locked_until:  # lock has expired: start counting again
                security.locked_until = None
                security.failed_login_count = 0
            if user.check_password(password):
                security.failed_login_count = 0
                security.locked_until = None
            else:
                security.failed_login_count += 1
                if security.failed_login_count >= settings.LOGIN_MAX_FAILED_ATTEMPTS:
                    security.locked_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
                outcome = "bad_password"
            security.save()

    if outcome == "locked":
        raise ApiError("account_locked", "Too many failed attempts. Try again later.", 423)
    if outcome == "bad_password":
        raise ApiError("invalid_credentials", "Incorrect email or password.", 401)

    # Password is correct from here on.
    if not user.is_active:
        raise ApiError("account_disabled", "This account has been deleted or disabled.", 403)
    if user.suspended_at is not None:
        raise ApiError("account_suspended", "This account has been suspended.", 403)
    if not user.is_email_verified:
        raise ApiError("email_not_verified", "Verify your email to continue.", 403)

    user.last_login_at = now
    user.save(update_fields=["last_login_at", "updated_at"])
    refresh = RefreshToken.for_user(user)
    return user, str(refresh.access_token), str(refresh)


def login_super_admin(*, email, password):
    """Authenticate a superadmin user. Rejects any non-superadmin accounts."""
    user, access, refresh = login(email=email, password=password)
    if user.role != Role.SUPER_ADMIN:
        raise ApiError("admin_access_denied", "Access denied. Administrator privileges required.", 403)
    return user, access, refresh


def logout(*, user, refresh_token):
    """Blacklist the refresh token. The short-lived access token simply expires."""
    try:
        token = RefreshToken(refresh_token)
    except TokenError:
        raise ApiError("invalid_token", "Invalid or expired refresh token.", 400)
    if str(token[api_settings.USER_ID_CLAIM]) != str(user.pk):
        raise ApiError("invalid_token", "Invalid or expired refresh token.", 400)
    token.blacklist()


def revoke_all_sessions(user):
    """Blacklist every refresh token the user has outstanding."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


# ---------------------------------------------------------------------------
# Password reset (Stateless signed token link via PasswordResetTokenGenerator)
# ---------------------------------------------------------------------------
def request_password_reset(*, email):
    """Always looks successful from the outside, so it cannot be used to discover accounts."""
    email = email.strip().lower()
    user = User.objects.filter(email=email, is_active=True, is_email_verified=True).first()
    if user is None:
        return

    # Check send limits / cooldown to prevent spamming
    cooldown_key = f"pwd_reset:cooldown:{email}"
    if cache.get(cooldown_key):
        return  # silently swallow
    if _incr(f"pwd_reset:sends:{email}", timeout=3600) > settings.OTP_MAX_SENDS_PER_HOUR:
        return  # silently swallow
    cache.set(cooldown_key, 1, timeout=settings.OTP_RESEND_COOLDOWN_SECONDS)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    timeout_minutes = getattr(settings, "PASSWORD_RESET_TIMEOUT", 900) // 60

    send_mail(
        "Reset your TalentBridge password",
        f"Hello {user.full_name or 'there'},\n\n"
        f"You requested to reset your password. Click the link below to set a new password:\n\n"
        f"{reset_link}\n\n"
        f"This link will expire in {timeout_minutes} minutes.\n"
        "If you did not request this, you can safely ignore this email.\n",
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )


def confirm_password_reset(*, uid, token, new_password):
    """Verify stateless signed token, set new password, unlock account and end every session."""
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ApiError("invalid_token", "The password reset link is invalid or has expired.", 400)

    if not default_token_generator.check_token(user, token):
        raise ApiError("invalid_token", "The password reset link is invalid or has expired.", 400)

    if not user.is_active:
        raise ApiError("account_disabled", "This account has been deleted or disabled.", 403)
    if user.suspended_at is not None:
        raise ApiError("account_suspended", "This account has been suspended.", 403)

    now = timezone.now()
    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])

        security, _ = UserSecurity.objects.select_for_update().get_or_create(user=user)
        security.password_last_changed_at = now
        security.failed_login_count = 0
        security.locked_until = None
        security.save()
        revoke_all_sessions(user)

    return user


# ---------------------------------------------------------------------------
# Google sign-in
# ---------------------------------------------------------------------------
def login_with_google(*, id_token, accept_terms=False, _retry=True):
    """Sign in (or sign up) with a Google ID token. Returns (user, access, refresh, created).

    1. Known Google identity            -> sign in as the linked user.
    2. Else a user with that email      -> link Google to it (Google has verified the email).
    3. Else                             -> create a CANDIDATE (recruiters register with the form).
    """
    claims = google_auth.verify_id_token(id_token)
    email, sub = claims["email"], claims["sub"]
    now = timezone.now()
    created = False

    try:
        with transaction.atomic():
            identity = (
                AuthIdentity.objects.select_related("user")
                .filter(provider=AuthProvider.GOOGLE, provider_user_id=sub)
                .first()
            )
            if identity:
                user = identity.user
            else:
                user = User.objects.select_for_update().filter(email=email).first()
                if user is None:
                    if not accept_terms:
                        raise ApiError("terms_required", "Accept the terms and privacy policy to create an account.", 400)
                    user = User.objects.create_user(
                        email,
                        None,  # no password: Google is the credential
                        role=Role.CANDIDATE,
                        full_name=(claims["name"] or email.split("@")[0])[:255],
                        profile_picture_url=(claims["picture"] or None) and claims["picture"][:500],
                        is_email_verified=True,
                        email_verified_at=now,
                        terms_accepted_at=now,
                        terms_version=settings.TERMS_VERSION,
                        privacy_accepted_at=now,
                        privacy_version=settings.PRIVACY_VERSION,
                    )
                    UserSecurity.objects.create(user=user)
                    created = True
                elif not user.is_email_verified:
                    # Pre-hijacking defence: someone may have registered this email with a password
                    # they chose. The real owner just proved the email via Google, so disable that password.
                    user.set_unusable_password()
                    user.is_email_verified = True
                    user.email_verified_at = now
                    user.save(update_fields=["password", "is_email_verified", "email_verified_at", "updated_at"])
                AuthIdentity.objects.create(
                    user=user, provider=AuthProvider.GOOGLE, provider_user_id=sub, provider_email=email
                )
    except IntegrityError:  # two first-time Google logins raced; the other request won
        if _retry:
            return login_with_google(id_token=id_token, accept_terms=accept_terms, _retry=False)
        raise

    if not user.is_active:
        raise ApiError("account_disabled", "This account has been deleted or disabled.", 403)
    if user.suspended_at is not None:
        raise ApiError("account_suspended", "This account has been suspended.", 403)

    user.last_login_at = now
    user.save(update_fields=["last_login_at", "updated_at"])
    refresh = RefreshToken.for_user(user)
    return user, str(refresh.access_token), str(refresh), created
