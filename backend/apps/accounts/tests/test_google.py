import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts import google_auth
from apps.accounts.models import AuthIdentity, User, UserSecurity
from apps.companies.models import Company
from shared.exceptions.api import ApiError

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"
EMAIL = "jane@example.com"


@pytest.fixture
def claims(monkeypatch):
    data = {"sub": "g-123", "email": EMAIL, "name": "Jane Doe", "picture": "https://img.example.com/j.png"}
    monkeypatch.setattr(google_auth, "verify_id_token", lambda token: dict(data))
    return data


def google(api, accept_terms=True, token="fake-token"):
    return api.post(reverse("accounts:google-login"), {"id_token": token, "accept_terms": accept_terms}, format="json")


def password_login(api, password=PASSWORD):
    return api.post(reverse("accounts:login"), {"email": EMAIL, "password": password}, format="json")


class TestNewAccount:
    def test_creates_verified_candidate(self, api, claims):
        r = google(api)
        assert r.status_code == 201 and r.data["created"] is True
        assert r.data["access"] and r.data["refresh"]
        user = User.objects.get(email=EMAIL)
        assert user.role == "candidate" and user.full_name == "Jane Doe"
        assert user.is_email_verified and user.email_verified_at
        assert not user.has_usable_password()
        assert user.profile_picture_url == "https://img.example.com/j.png"
        assert user.terms_accepted_at and user.terms_version == "1.0"
        assert UserSecurity.objects.filter(user=user).exists()
        ident = AuthIdentity.objects.get()
        assert (ident.provider, ident.provider_user_id, ident.provider_email) == ("google", "g-123", EMAIL)
        assert not Company.objects.exists()

    def test_issued_token_works(self, api, claims):
        access = google(api).data["access"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        assert api.get(reverse("accounts:me")).data["email"] == EMAIL

    def test_terms_required_for_new_accounts(self, api, claims):
        r = google(api, accept_terms=False)
        assert r.status_code == 400 and r.data["code"] == "terms_required"
        assert not User.objects.exists() and not AuthIdentity.objects.exists()

    def test_name_falls_back_to_email_prefix(self, api, claims):
        claims["name"] = ""
        google(api)
        assert User.objects.get().full_name == "jane"


class TestExistingAccounts:
    def test_returning_google_user_signs_in_without_duplicates(self, api, claims):
        google(api)
        r = google(api, accept_terms=False)  # terms only matter for new accounts
        assert r.status_code == 200 and r.data["created"] is False
        assert User.objects.count() == 1 and AuthIdentity.objects.count() == 1
        assert User.objects.get().last_login_at is not None

    def test_links_to_verified_password_account(self, api, claims):
        user = User.objects.create_user(EMAIL, PASSWORD, full_name="Jane", is_email_verified=True)
        r = google(api)
        assert r.status_code == 200 and r.data["created"] is False and r.data["user"]["id"] == user.id
        assert AuthIdentity.objects.get().user == user
        assert password_login(api).status_code == 200  # password still works

    def test_unverified_password_account_loses_its_password(self, api, claims):
        """Someone could pre-register a victim's email with their own password."""
        user = User.objects.create_user(EMAIL, PASSWORD, full_name="Attacker", is_email_verified=False)
        assert google(api).status_code == 200
        user.refresh_from_db()
        assert user.is_email_verified and not user.has_usable_password()
        assert password_login(api).status_code == 401  # the pre-set password no longer works

    def test_recruiter_can_use_google_and_keeps_role(self, api, claims):
        user = User.objects.create_user(EMAIL, PASSWORD, full_name="HR", role="recruiter", is_email_verified=True)
        Company.objects.create(name="Acme", admin_user=user)
        r = google(api)
        assert r.status_code == 200 and r.data["user"]["role"] == "recruiter"
        assert r.data["user"]["company"]["name"] == "Acme"

    def test_suspended_user_blocked(self, api, claims):
        User.objects.create_user(EMAIL, PASSWORD, full_name="J", is_email_verified=True, suspended_at=timezone.now())
        r = google(api)
        assert r.status_code == 403 and r.data["code"] == "account_suspended"

    def test_soft_deleted_user_blocked(self, api, claims):
        User.objects.create_user(EMAIL, PASSWORD, full_name="J", is_email_verified=True, is_active=False)
        r = google(api)
        assert r.status_code == 403 and r.data["code"] == "account_disabled"


class TestErrors:
    def test_invalid_token(self, api, monkeypatch):
        def bad(token):
            raise ApiError("invalid_google_token", "Google sign-in failed. Please try again.", 401)

        monkeypatch.setattr(google_auth, "verify_id_token", bad)
        r = google(api)
        assert r.status_code == 401 and r.data["code"] == "invalid_google_token"
        assert not User.objects.exists()

    def test_missing_token(self, api):
        assert api.post(reverse("accounts:google-login"), {}, format="json").status_code == 400

    def test_not_configured(self, api, settings):
        settings.GOOGLE_CLIENT_ID = ""
        r = google(api)
        assert r.status_code == 503 and r.data["code"] == "google_not_configured"


class TestVerifyIdToken:
    """Our wrapper around Google's library (the library itself is mocked: no network in tests)."""

    def test_returns_normalised_claims(self, settings, monkeypatch):
        settings.GOOGLE_CLIENT_ID = "client-id"
        monkeypatch.setattr(
            google_auth.google_id_token, "verify_oauth2_token",
            lambda token, req, aud: {"sub": 42, "email": "Jane@Example.COM", "email_verified": True, "name": " Jane "},
        )
        assert google_auth.verify_id_token("t") == {
            "sub": "42", "email": "jane@example.com", "name": "Jane", "picture": None,
        }

    def test_unverified_google_email_rejected(self, settings, monkeypatch):
        settings.GOOGLE_CLIENT_ID = "client-id"
        monkeypatch.setattr(
            google_auth.google_id_token, "verify_oauth2_token",
            lambda token, req, aud: {"sub": "1", "email": "a@b.com", "email_verified": False},
        )
        with pytest.raises(ApiError) as exc:
            google_auth.verify_id_token("t")
        assert exc.value.detail["code"] == "google_email_unverified"

    def test_bad_signature_or_audience_rejected(self, settings, monkeypatch):
        settings.GOOGLE_CLIENT_ID = "client-id"

        def boom(token, req, aud):
            raise ValueError("Wrong recipient")

        monkeypatch.setattr(google_auth.google_id_token, "verify_oauth2_token", boom)
        with pytest.raises(ApiError) as exc:
            google_auth.verify_id_token("t")
        assert exc.value.status_code == 401 and exc.value.detail["code"] == "invalid_google_token"
