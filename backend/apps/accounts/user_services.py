"""User profile and security services (Module 2).

Handles self-service profile management, photo upload, password changing,
and linked OAuth identity management for any authenticated user.
"""
import os
import uuid
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.utils import timezone

from shared.exceptions.api import ApiError

from .audit import record_audit_log
from .models import AuthIdentity, User, UserSecurity
from .services import revoke_all_sessions

ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
MAX_PHOTO_SIZE = 2 * 1024 * 1024  # 2 MB


def get_profile(user):
    """Return user profile with security flags."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "profile_picture_url": user.profile_picture_url,
        "role": user.role,
        "is_email_verified": user.is_email_verified,
        "has_password": user.has_usable_password(),
        "created_at": user.created_at,
    }


def update_profile(*, user, full_name=None, phone=None, request=None):
    """Update profile personal information (email is read-only)."""
    old_values = {"full_name": user.full_name, "phone": user.phone}
    updated = False

    if full_name is not None and full_name.strip():
        user.full_name = full_name.strip()
        updated = True

    if phone is not None:
        user.phone = phone.strip() or None
        updated = True

    if updated:
        user.save(update_fields=["full_name", "phone", "updated_at"])
        record_audit_log(
            actor=user,
            action="profile_updated",
            entity_type="user",
            entity_id=user.id,
            old_values=old_values,
            new_values={"full_name": user.full_name, "phone": user.phone},
            request=request,
        )

    return get_profile(user)


def update_profile_photo(*, user, photo_file, request=None):
    """Validate and upload profile photo (jpg, png, webp <= 2MB).

    Saved under media/profile_photos/ in development.
    """
    if photo_file.size > MAX_PHOTO_SIZE:
        raise ApiError("photo_too_large", "Photo must be smaller than 2 MB.", 400)

    content_type = getattr(photo_file, "content_type", "").lower()
    if content_type not in ALLOWED_PHOTO_TYPES:
        raise ApiError(
            "invalid_photo_type",
            "Photo must be a JPEG, PNG, or WebP image.",
            400,
        )

    ext = os.path.splitext(photo_file.name)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    filename = f"profile_photos/{user.id}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = default_storage.save(filename, photo_file)
    photo_url = f"{settings.MEDIA_URL.rstrip('/')}/{saved_path.lstrip('/')}"

    old_url = user.profile_picture_url

    # Attempt to clean up old local media file if present
    if old_url and old_url.startswith(settings.MEDIA_URL):
        old_rel_path = old_url[len(settings.MEDIA_URL):].lstrip("/")
        if default_storage.exists(old_rel_path):
            try:
                default_storage.delete(old_rel_path)
            except Exception:
                pass

    user.profile_picture_url = photo_url
    user.save(update_fields=["profile_picture_url", "updated_at"])

    record_audit_log(
        actor=user,
        action="profile_photo_updated",
        entity_type="user",
        entity_id=user.id,
        old_values={"profile_picture_url": old_url},
        new_values={"profile_picture_url": photo_url},
        request=request,
    )

    return photo_url


def delete_profile_photo(*, user, request=None):
    """Remove user's profile photo."""
    old_url = user.profile_picture_url
    if not old_url:
        return

    if old_url.startswith(settings.MEDIA_URL):
        old_rel_path = old_url[len(settings.MEDIA_URL):].lstrip("/")
        if default_storage.exists(old_rel_path):
            try:
                default_storage.delete(old_rel_path)
            except Exception:
                pass

    user.profile_picture_url = None
    user.save(update_fields=["profile_picture_url", "updated_at"])

    record_audit_log(
        actor=user,
        action="profile_photo_deleted",
        entity_type="user",
        entity_id=user.id,
        old_values={"profile_picture_url": old_url},
        new_values={"profile_picture_url": None},
        request=request,
    )


def change_password(*, user, current_password=None, new_password=None, request=None):
    """Change user password.

    Validates current password if user already has one.
    Validates new password strength, updates password hash,
    updates password_last_changed_at (invalidating active JWTs),
    and revokes all active refresh tokens.
    """
    if user.has_usable_password():
        if not current_password:
            raise ApiError("current_password_required", "Current password is required.", 400)
        if not user.check_password(current_password):
            raise ApiError("invalid_current_password", "Current password is incorrect.", 400)

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        raise ApiError("weak_password", list(exc.messages), 400)

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])

    now = timezone.now()
    security, _ = UserSecurity.objects.select_for_update().get_or_create(user=user)
    security.password_last_changed_at = now
    security.failed_login_count = 0
    security.locked_until = None
    security.save()

    revoke_all_sessions(user)

    record_audit_log(
        actor=user,
        action="password_changed",
        entity_type="user",
        entity_id=user.id,
        request=request,
    )


def list_linked_logins(*, user):
    """Return all OAuth logins linked to this user."""
    return list(
        AuthIdentity.objects.filter(user=user)
        .values("id", "provider", "provider_email", "created_at")
        .order_by("created_at")
    )


def unlink_login(*, user, identity_id, request=None):
    """Unlink an OAuth identity.

    Safety rule: If user has no password set and this is their only identity,
    they cannot unlink it (they would be permanently locked out).
    """
    identity = AuthIdentity.objects.filter(user=user, id=identity_id).first()
    if not identity:
        raise ApiError("identity_not_found", "Linked login not found.", 404)

    identities_count = AuthIdentity.objects.filter(user=user).count()
    if not user.has_usable_password() and identities_count <= 1:
        raise ApiError(
            "password_required_to_unlink",
            "Set a password first before disconnecting Google, so you don't lose access to your account.",
            400,
        )

    provider = identity.provider
    identity.delete()

    record_audit_log(
        actor=user,
        action="identity_unlinked",
        entity_type="user",
        entity_id=user.id,
        details={"provider": provider},
        request=request,
    )

