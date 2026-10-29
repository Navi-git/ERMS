import pytest
from django.core import mail
from django.urls import reverse

from apps.accounts import services
from apps.accounts.models import OtpVerification, User, UserSecurity
from apps.companies.models import Company
from shared.constants.auth import OtpPurpose

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def candidate(**over):
    data = {"email": "jane@example.com", "password": PASSWORD, "role": "candidate",
            "full_name": "Jane Doe", "accept_terms": True}
    data.update(over)
    return data


def recruiter(**over):
    data = {"email": "hr@acme.com", "password": PASSWORD, "role": "recruiter",
            "company_name": "Acme Corp", "accept_terms": True}
    data.update(over)
    return data


def post(api, payload):
    return api.post(reverse("accounts:register"), payload, format="json")


class TestCandidateRegistration:
    def test_success_creates_user_security_and_otp(self, api):
        r = post(api, candidate(email="Jane@Example.com"))
        assert r.status_code == 201
        assert r.data["user"]["email"] == "jane@example.com"
        assert "password" not in r.data["user"] and "password_hash" not in r.data["user"]

        user = User.objects.get(email="jane@example.com")
        assert user.role == "candidate" and user.full_name == "Jane Doe"
        assert user.is_email_verified is False
        assert user.password != PASSWORD and user.check_password(PASSWORD)
        assert user.terms_accepted_at and user.terms_version == "1.0"
        assert user.privacy_accepted_at and user.privacy_version == "1.0"
        assert UserSecurity.objects.filter(user=user).exists()
        assert not Company.objects.exists()

        otp = OtpVerification.objects.get(destination="jane@example.com")
        assert otp.purpose == OtpPurpose.EMAIL_VERIFICATION and otp.user == user
        assert len(otp.otp_code) == 6 and otp.otp_code.isdigit()
        assert otp.verified_at is None and otp.expires_at > otp.created_at
        assert len(mail.outbox) == 1 and otp.otp_code in mail.outbox[0].body

    def test_full_name_required_for_candidate(self, api):
        payload = candidate()
        payload.pop("full_name")
        r = post(api, payload)
        assert r.status_code == 400 and "full_name" in r.data
        assert not User.objects.exists()


class TestRecruiterRegistration:
    def test_success_creates_company_with_company_name_only(self, api):
        r = post(api, recruiter())
        assert r.status_code == 201
        user = User.objects.get(email="hr@acme.com")
        assert user.role == "recruiter" and user.full_name == "Acme Corp"  # decision B
        company = Company.objects.get()
        assert company.name == "Acme Corp" and company.admin_user == user
        assert company.verification_status == "PENDING" and company.industry is None

    def test_explicit_full_name_is_kept(self, api):
        post(api, recruiter(full_name="Priya Nair"))
        assert User.objects.get().full_name == "Priya Nair"

    def test_company_name_required(self, api):
        payload = recruiter()
        payload.pop("company_name")
        r = post(api, payload)
        assert r.status_code == 400 and "company_name" in r.data
        assert not User.objects.exists() and not Company.objects.exists()


class TestValidation:
    def test_super_admin_cannot_self_register(self, api):
        r = post(api, candidate(role="super_admin"))
        assert r.status_code == 400 and "role" in r.data
        assert not User.objects.exists()

    def test_terms_must_be_accepted(self, api):
        r = post(api, candidate(accept_terms=False))
        assert r.status_code == 400 and "accept_terms" in r.data

    def test_weak_password_rejected(self, api):
        r = post(api, candidate(password="12345678"))
        assert r.status_code == 400 and "password" in r.data

    def test_invalid_email_rejected(self, api):
        assert post(api, candidate(email="not-an-email")).status_code == 400


class TestDuplicates:
    def test_verified_email_is_rejected(self, api):
        post(api, candidate())
        User.objects.update(is_email_verified=True)
        r = post(api, candidate(email="JANE@example.com"))
        assert r.status_code == 409 and r.data["code"] == "email_already_registered"
        assert User.objects.count() == 1

    def test_unverified_email_gets_specific_code(self, api):
        post(api, candidate())
        r = post(api, candidate())
        assert r.status_code == 409 and r.data["code"] == "email_not_verified"
        assert User.objects.count() == 1


class TestAtomicity:
    def test_email_failure_rolls_everything_back(self, monkeypatch):
        def boom(*args, **kwargs):
            raise OSError("smtp down")

        monkeypatch.setattr(services, "send_mail", boom)
        with pytest.raises(OSError):
            services.register_user(email="x@y.com", password=PASSWORD, role="recruiter", company_name="Acme")
        assert not User.objects.exists()
        assert not Company.objects.exists()
        assert not UserSecurity.objects.exists()
        assert not OtpVerification.objects.exists()
