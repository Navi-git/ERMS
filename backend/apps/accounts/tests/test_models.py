import pytest
from django.core.exceptions import FieldDoesNotExist
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from apps.accounts.models import AuthIdentity, OtpVerification, User, UserSecurity
from shared.constants.roles import Role


@pytest.mark.django_db
class TestUserModel:
    def test_create_user_defaults_and_hashing(self):
        u = User.objects.create_user("Jane@Example.COM", "S3cure-pass!", full_name="Jane")
        assert u.email == "jane@example.com"
        assert u.role == Role.CANDIDATE
        assert u.is_active is True
        assert u.is_email_verified is False
        assert u.password != "S3cure-pass!" and u.check_password("S3cure-pass!")
        assert u.created_at and u.updated_at

    def test_email_required(self):
        with pytest.raises(ValueError):
            User.objects.create_user("", "x", full_name="No Email")

    def test_email_unique(self):
        User.objects.create_user("a@x.com", "pw12345678", full_name="A")
        with pytest.raises(IntegrityError), transaction.atomic():
            User.objects.create_user("a@x.com", "pw12345678", full_name="B")

    def test_superuser_is_super_admin_and_staff(self):
        u = User.objects.create_superuser("root@x.com", "pw12345678", full_name="Root")
        assert u.role == Role.SUPER_ADMIN and u.is_staff and u.is_email_verified

    def test_candidate_is_not_staff(self):
        u = User.objects.create_user("c@x.com", "pw12345678", full_name="C")
        assert not u.is_staff


class TestErdMapping:
    def test_table_names(self):
        assert User._meta.db_table == "users"
        assert UserSecurity._meta.db_table == "user_security"
        assert OtpVerification._meta.db_table == "otp_verifications"
        assert AuthIdentity._meta.db_table == "auth_identities"

    def test_password_column_is_password_hash(self):
        assert User._meta.get_field("password").column == "password_hash"

    def test_suspended_by_column_matches_erd(self):
        assert User._meta.get_field("suspended_by").column == "suspended_by"

    def test_no_django_last_login_column(self):
        with pytest.raises(FieldDoesNotExist):
            User._meta.get_field("last_login")
        assert User._meta.get_field("last_login_at")

    @pytest.mark.django_db
    def test_users_table_columns_match_erd(self):
        """Reads the real PostgreSQL table, so it also catches a stale migration."""
        with connection.cursor() as cursor:
            columns = {c.name for c in connection.introspection.get_table_description(cursor, "users")}
        assert columns == {
            "id", "role", "email", "password_hash", "full_name", "phone",
            "profile_picture_url", "is_active", "is_email_verified", "email_verified_at",
            "terms_accepted_at", "terms_version", "privacy_accepted_at", "privacy_version",
            "last_login_at", "suspended_at", "suspended_by", "created_at", "updated_at",
        }


@pytest.mark.django_db
class TestRelatedTables:
    def test_user_security_is_one_to_one(self):
        u = User.objects.create_user("s@x.com", "pw12345678", full_name="S")
        UserSecurity.objects.create(user=u)
        with pytest.raises(IntegrityError), transaction.atomic():
            UserSecurity.objects.create(user=u)

    def test_user_security_defaults(self):
        u = User.objects.create_user("d@x.com", "pw12345678", full_name="D")
        s = UserSecurity.objects.create(user=u)
        assert s.failed_login_count == 0 and s.locked_until is None and s.two_fa_enabled is False

    def test_otp_row(self):
        o = OtpVerification.objects.create(
            destination="o@x.com", purpose="email_verification", otp_code="123456",
            expires_at=timezone.now(),
        )
        assert o.verified_at is None and o.user is None

    def test_auth_identity(self):
        u = User.objects.create_user("g@x.com", "pw12345678", full_name="G")
        i = AuthIdentity.objects.create(user=u, provider="google", provider_user_id="abc")
        assert u.auth_identities.count() == 1 and i.created_at