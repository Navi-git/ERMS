import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.accounts.models import AuditLog, AuthIdentity, User, UserSecurity
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def make_user(email="user@example.com", password=PASSWORD, role=Role.CANDIDATE, **extra):
    extra.setdefault("full_name", "Test User")
    user = User.objects.create_user(email, password, is_email_verified=True, role=role, **extra)
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


def create_dummy_image(ext="png"):
    return SimpleUploadedFile(f"avatar.{ext}", TINY_PNG, content_type=f"image/{ext}")



class TestUserProfile:
    def test_unauthenticated_profile_access_denied(self, api):
        assert api.get(reverse("users:user-profile")).status_code == 401

    def test_get_own_profile(self, api):
        user = make_user("alice@example.com", full_name="Alice Wonderland", phone="+1234567890")
        auth_client(api, user)
        res = api.get(reverse("users:user-profile"))
        assert res.status_code == 200
        assert res.data["email"] == "alice@example.com"
        assert res.data["full_name"] == "Alice Wonderland"
        assert res.data["phone"] == "+1234567890"
        assert res.data["has_password"] is True

    def test_update_profile_info(self, api):
        user = make_user("bob@example.com", full_name="Bob Original")
        auth_client(api, user)

        res = api.patch(reverse("users:user-profile"), {"full_name": "Bob Updated", "phone": "9876543210"})
        assert res.status_code == 200
        assert res.data["full_name"] == "Bob Updated"
        assert res.data["phone"] == "9876543210"

        user.refresh_from_db()
        assert user.full_name == "Bob Updated"
        assert user.phone == "9876543210"

        # Check audit log created
        log = AuditLog.objects.filter(actor=user, action="profile_updated").first()
        assert log is not None
        assert log.old_values.get("full_name") == "Bob Original"
        assert log.new_values.get("full_name") == "Bob Updated"

    def test_profile_photo_upload_and_delete(self, api):
        user = make_user("charlie@example.com")
        auth_client(api, user)

        photo = create_dummy_image("png")
        res = api.put(reverse("users:user-profile-photo"), {"photo": photo}, format="multipart")
        assert res.status_code == 200
        assert "profile_picture_url" in res.data
        photo_url = res.data["profile_picture_url"]

        user.refresh_from_db()
        assert user.profile_picture_url == photo_url

        # Check audit log
        assert AuditLog.objects.filter(actor=user, action="profile_photo_updated").exists()

        # Delete photo
        del_res = api.delete(reverse("users:user-profile-photo"))
        assert del_res.status_code == 200
        user.refresh_from_db()
        assert user.profile_picture_url is None
        assert AuditLog.objects.filter(actor=user, action="profile_photo_deleted").exists()

    def test_profile_photo_size_limit_and_type_validation(self, api):
        user = make_user("david@example.com")
        auth_client(api, user)

        # Invalid file type (e.g. text file disguised as jpg)
        fake_file = SimpleUploadedFile("fake.txt", b"not an image content", content_type="text/plain")
        res = api.put(reverse("users:user-profile-photo"), {"photo": fake_file}, format="multipart")
        assert res.status_code == 400

        # Oversized file (> 2 MB)
        big_data = b"x" * (2 * 1024 * 1024 + 10)
        oversized_file = SimpleUploadedFile("big.png", big_data, content_type="image/png")
        res2 = api.put(reverse("users:user-profile-photo"), {"photo": oversized_file}, format="multipart")
        assert res2.status_code == 400


class TestUserPasswordAndSecurity:
    def test_change_password_success(self, api):
        user = make_user("elena@example.com")
        auth_client(api, user)

        new_pw = "N3w-Str0ng-P@ssword!2026"
        res = api.post(
            reverse("users:user-password-change"),
            {"current_password": PASSWORD, "new_password": new_pw},
        )
        assert res.status_code == 200

        user.refresh_from_db()
        assert user.check_password(new_pw)
        assert AuditLog.objects.filter(actor=user, action="password_changed").exists()

    def test_change_password_wrong_current_password(self, api):
        user = make_user("frank@example.com")
        auth_client(api, user)

        res = api.post(
            reverse("users:user-password-change"),
            {"current_password": "WrongPassword123!", "new_password": "N3w-Str0ng-P@ssword!2026"},
        )
        assert res.status_code == 400
        assert res.data["code"] == "invalid_current_password"

    def test_change_password_weak_password_rejected(self, api):
        user = make_user("grace@example.com")
        auth_client(api, user)

        res = api.post(
            reverse("users:user-password-change"),
            {"current_password": PASSWORD, "new_password": "123"},
        )
        assert res.status_code == 400


class TestLinkedLogins:
    def test_list_linked_logins(self, api):
        user = make_user("hannah@example.com")
        AuthIdentity.objects.create(
            user=user,
            provider="google",
            provider_user_id="google-12345",
            provider_email="hannah@example.com",
        )
        auth_client(api, user)

        res = api.get(reverse("users:user-linked-logins"))
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["provider"] == "google"

    def test_unlink_google_allowed_when_password_exists(self, api):
        user = make_user("ian@example.com")
        identity = AuthIdentity.objects.create(
            user=user,
            provider="google",
            provider_user_id="google-67890",
            provider_email="ian@example.com",
        )
        auth_client(api, user)

        res = api.delete(reverse("users:user-linked-logins-detail", kwargs={"identity_id": identity.id}))
        assert res.status_code == 200
        assert not AuthIdentity.objects.filter(id=identity.id).exists()
        assert AuditLog.objects.filter(actor=user, action="identity_unlinked").exists()

    def test_unlink_google_blocked_when_no_password_set(self, api):
        # User created without password (unusable password like Google OAuth sign up)
        user = User.objects.create_user("jack@example.com", password=None, is_email_verified=True)
        identity = AuthIdentity.objects.create(
            user=user,
            provider="google",
            provider_user_id="google-99999",
            provider_email="jack@example.com",
        )
        auth_client(api, user)

        res = api.delete(reverse("users:user-linked-logins-detail", kwargs={"identity_id": identity.id}))
        assert res.status_code == 400
        assert res.data["code"] == "password_required_to_unlink"
        assert AuthIdentity.objects.filter(id=identity.id).exists()
