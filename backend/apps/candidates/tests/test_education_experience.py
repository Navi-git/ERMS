import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserSecurity
from apps.candidates.models import CandidateProfile, Education, Experience
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_candidate(email="cand_edu_exp@example.com"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.CANDIDATE,
        full_name="Candidate Edu Exp",
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestCandidateEducation:
    def test_education_crud(self, api):
        user = make_candidate("edu_user@example.com")
        auth_client(api, user)

        # 1. Create Education
        payload = {
            "institution": "Stanford University",
            "degree": "Bachelor of Science",
            "field_of_study": "Computer Science",
            "start_date": "2018-09-01",
            "end_date": "2022-06-15",
            "is_currently_studying": False,
            "gpa": "3.85",
        }
        create_res = api.post("/api/v1/candidate/education/", data=payload, format="json")
        assert create_res.status_code == status.HTTP_201_CREATED
        edu_id = create_res.data["id"]
        assert create_res.data["institution"] == "Stanford University"

        # 2. List Education
        list_res = api.get("/api/v1/candidate/education/")
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.data) == 1

        # 3. Update Education
        update_res = api.patch(f"/api/v1/candidate/education/{edu_id}/", data={"gpa": "3.90"}, format="json")
        assert update_res.status_code == status.HTTP_200_OK
        assert update_res.data["gpa"] == "3.90"

        # 4. Delete Education
        del_res = api.delete(f"/api/v1/candidate/education/{edu_id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not Education.objects.filter(id=edu_id).exists()

    def test_education_invalid_dates(self, api):
        user = make_candidate("edu_invalid@example.com")
        auth_client(api, user)

        payload = {
            "institution": "MIT",
            "start_date": "2022-01-01",
            "end_date": "2020-01-01",  # End date before start date
            "is_currently_studying": False,
        }
        res = api.post("/api/v1/candidate/education/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in res.data


class TestCandidateExperience:
    def test_experience_crud(self, api):
        user = make_candidate("exp_user@example.com")
        auth_client(api, user)

        # 1. Create Experience
        payload = {
            "job_title": "Software Engineer",
            "company_name": "Acme Corp",
            "employment_type": "full_time",
            "start_date": "2022-07-01",
            "is_current": True,
            "description": "Building scalable web services with Django & React.",
            "location": "Remote",
        }
        create_res = api.post("/api/v1/candidate/experience/", data=payload, format="json")
        assert create_res.status_code == status.HTTP_201_CREATED
        exp_id = create_res.data["id"]
        assert create_res.data["job_title"] == "Software Engineer"
        assert create_res.data["is_current"] is True

        # 2. List Experience
        list_res = api.get("/api/v1/candidate/experience/")
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.data) == 1

        # 3. Update Experience
        update_res = api.patch(f"/api/v1/candidate/experience/{exp_id}/", data={"job_title": "Senior Software Engineer"}, format="json")
        assert update_res.status_code == status.HTTP_200_OK
        assert update_res.data["job_title"] == "Senior Software Engineer"

        # 4. Delete Experience
        del_res = api.delete(f"/api/v1/candidate/experience/{exp_id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not Experience.objects.filter(id=exp_id).exists()

