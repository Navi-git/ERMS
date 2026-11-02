import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserSecurity
from apps.candidates.models import CandidateProfile, Resume, ResumeAnalysis
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_candidate(email="cand_resume@example.com"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.CANDIDATE,
        full_name="Candidate Resume Test",
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def make_other_candidate(email="other_cand@example.com"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.CANDIDATE,
        full_name="Other Candidate",
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def make_recruiter(email="recruiter_resume@example.com"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.RECRUITER,
        full_name="Recruiter Resume Test",
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestResumeManagementAndATS:
    def test_upload_resume_triggers_ats_analysis(self, api):
        user = make_candidate("resume_cand1@example.com")
        auth_client(api, user)

        sample_resume_text = (
            "John Doe\njohn@example.com | (555) 123-4567 | San Francisco, CA\n\n"
            "Professional Summary\n"
            "Dynamic Software Engineer with 5+ years of experience building scalable web applications.\n\n"
            "Technical Skills\n"
            "Python, Django, React, PostgreSQL, Docker, AWS, Git, REST APIs\n\n"
            "Work Experience\n"
            "Senior Engineer - Tech Corp (2020 - Present)\n"
            "- Architected microservices reducing latency by 45%.\n"
            "- Led a cross-functional team of 6 engineers to launch cloud platform serving 500,000 users.\n"
            "- Optimized SQL queries improving database throughput by 30%.\n\n"
            "Education\n"
            "B.S. in Computer Science - University of California, Berkeley"
        )
        fake_file = SimpleUploadedFile("john_doe_resume.pdf", sample_resume_text.encode("utf-8"), content_type="application/pdf")

        res = api.post(
            "/api/v1/candidate/resumes/",
            data={"file": fake_file, "title": "Primary Tech Resume", "is_default": "true"},
            format="multipart",
        )
        assert res.status_code == status.HTTP_201_CREATED
        resume_id = res.data["id"]
        assert res.data["is_default"] is True
        assert res.data["title"] == "Primary Tech Resume"
        assert res.data["ats_score"] is not None
        assert res.data["ats_score"] >= 40
        assert "analysis" in res.data
        assert len(res.data["analysis"]["strengths"]) > 0

    def test_set_default_and_archive_resume(self, api):
        user = make_candidate("resume_cand2@example.com")
        auth_client(api, user)

        content = b"Resume content for candidate test"
        file1 = SimpleUploadedFile("resume1.pdf", content, content_type="application/pdf")
        file2 = SimpleUploadedFile("resume2.pdf", content, content_type="application/pdf")

        res1 = api.post("/api/v1/candidate/resumes/", data={"file": file1, "title": "R1"}, format="multipart")
        res2 = api.post("/api/v1/candidate/resumes/", data={"file": file2, "title": "R2"}, format="multipart")
        r1_id = res1.data["id"]
        r2_id = res2.data["id"]

        # Set R2 as default
        def_res = api.post(f"/api/v1/candidate/resumes/{r2_id}/set-default/")
        assert def_res.status_code == status.HTTP_200_OK
        assert def_res.data["is_default"] is True

        # Archive R2
        arch_res = api.post(f"/api/v1/candidate/resumes/{r2_id}/archive/")
        assert arch_res.status_code == status.HTTP_200_OK
        assert arch_res.data["archived_at"] is not None

        # Verify listing defaults to active resumes
        list_res = api.get("/api/v1/candidate/resumes/")
        assert list_res.status_code == status.HTTP_200_OK
        active_ids = [r["id"] for r in list_res.data]
        assert r2_id not in active_ids
        assert r1_id in active_ids

    def test_resume_download_permissions(self, api):
        owner = make_candidate("owner@example.com")
        other_user = make_other_candidate("stranger@example.com")
        recruiter = make_recruiter("recruiter_dl@example.com")

        auth_client(api, owner)
        file_obj = SimpleUploadedFile("cv.pdf", b"Confidential Resume Text", content_type="application/pdf")
        create_res = api.post("/api/v1/candidate/resumes/", data={"file": file_obj, "title": "CV"}, format="multipart")
        resume_id = create_res.data["id"]

        # 1. Owner can download
        dl_res = api.get(f"/api/v1/candidate/resumes/{resume_id}/download/")
        assert dl_res.status_code == status.HTTP_200_OK

        # 2. Recruiter can download
        auth_client(api, recruiter)
        recruiter_dl = api.get(f"/api/v1/candidate/resumes/{resume_id}/download/")
        assert recruiter_dl.status_code == status.HTTP_200_OK

        # 3. Unrelated candidate is forbidden
        auth_client(api, other_user)
        stranger_dl = api.get(f"/api/v1/candidate/resumes/{resume_id}/download/")
        assert stranger_dl.status_code == status.HTTP_403_FORBIDDEN
