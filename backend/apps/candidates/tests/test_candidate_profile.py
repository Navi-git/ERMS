import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserSecurity
from apps.candidates.models import CandidateProfile, SeekingStatus
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_candidate(email="candidate@example.com", **extra):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.CANDIDATE,
        full_name="Candidate User",
        **extra,
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def make_recruiter(email="recruiter@example.com", **extra):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.RECRUITER,
        full_name="Recruiter User",
        **extra,
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestCandidateProfile:
    def test_get_or_create_profile(self, api):
        candidate = make_candidate("cand1@example.com")
        auth_client(api, candidate)

        # Profile does not exist yet
        assert not CandidateProfile.objects.filter(user=candidate).exists()

        res = api.get("/api/v1/candidate/profile/")
        assert res.status_code == status.HTTP_200_OK
        assert CandidateProfile.objects.filter(user=candidate).exists()
        assert "completeness" in res.data
        assert res.data["completeness"]["percentage"] >= 0

    def test_patch_candidate_profile(self, api):
        candidate = make_candidate("cand2@example.com")
        auth_client(api, candidate)

        update_payload = {
            "headline": "Senior Full-Stack Engineer",
            "summary": "Experienced engineer specializing in React and Django.",
            "current_location": "San Francisco, CA",
            "seeking_status": SeekingStatus.OPEN_TO_OFFERS,
            "expected_salary_min": 120000,
            "expected_salary_max": 160000,
            "currency": "USD",
            "willing_to_relocate": True,
            "linkedin_url": "https://linkedin.com/in/test-cand",
        }

        res = api.patch("/api/v1/candidate/profile/", data=update_payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["headline"] == "Senior Full-Stack Engineer"
        assert res.data["seeking_status"] == SeekingStatus.OPEN_TO_OFFERS
        assert res.data["willing_to_relocate"] is True
        assert res.data["completeness"]["percentage"] > 0

    def test_recruiter_forbidden_from_candidate_profile(self, api):
        recruiter = make_recruiter("recruiter1@example.com")
        auth_client(api, recruiter)

        res = api.get("/api/v1/candidate/profile/")
        assert res.status_code == status.HTTP_403_FORBIDDEN
