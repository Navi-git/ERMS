import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserSecurity
from apps.candidates.models import CandidateProfile, Experience, SeekingStatus
from apps.candidates.services.profile_service import add_or_update_candidate_skill
from apps.master_data.models import MasterDataItem
from shared.constants.master_data import MasterDataCategory
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_user(email, role=Role.CANDIDATE, full_name="John Doe"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=role,
        full_name=full_name,
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestRecruiterCandidateSearch:
    def test_search_privacy_masking_and_seeking_status(self, api):
        # 1. Candidate A: actively seeking
        cand_a_user = make_user("alice.smith@example.com", full_name="Alice Smith")
        prof_a = CandidateProfile.objects.create(
            user=cand_a_user,
            headline="Full Stack Python Developer",
            summary="Passionate about building scalable backend services.",
            current_location="Austin, TX",
            seeking_status=SeekingStatus.ACTIVELY_SEEKING,
        )
        py_skill = MasterDataItem.objects.create(
            category=MasterDataCategory.SKILL, key="python_search", value="Python", is_active=True
        )
        add_or_update_candidate_skill(prof_a, skill_id=py_skill.id)

        # 2. Candidate B: not seeking (MUST BE HIDDEN)
        cand_b_user = make_user("bob.jones@example.com", full_name="Bob Jones")
        CandidateProfile.objects.create(
            user=cand_b_user,
            headline="Python Architect",
            seeking_status=SeekingStatus.NOT_SEEKING,
        )

        # 3. Recruiter searches
        recruiter = make_user("recruiter_search@example.com", role=Role.RECRUITER, full_name="Rex Recruiter")
        auth_client(api, recruiter)

        res = api.get("/api/v1/recruiter/candidates/?skills=python")
        assert res.status_code == status.HTTP_200_OK
        results = res.data

        # Only Alice should appear; Bob is not seeking
        assert len(results) == 1
        item = results[0]
        assert item["masked_name"] == "Alice S."
        assert item["masked_email"] == "a***@***.com"
        assert item["headline"] == "Full Stack Python Developer"
        assert item["current_location"] == "Austin, TX"

    def test_candidate_forbidden_from_recruiter_search(self, api):
        candidate = make_user("regular_cand@example.com", role=Role.CANDIDATE)
        auth_client(api, candidate)

        res = api.get("/api/v1/recruiter/candidates/")
        assert res.status_code == status.HTTP_403_FORBIDDEN
