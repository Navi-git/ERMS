"""Tests for Super Admin Job Directory, Moderation, and Internal Notes."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import EntityNote, Job, JobStatus, Report
from shared.constants.roles import Role


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="superadmin_jobs@example.com",
        password="Password123!",
        role=Role.SUPER_ADMIN,
        full_name="Platform Admin",
    )


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        email="regular_candidate@example.com",
        password="Password123!",
        role=Role.CANDIDATE,
    )


@pytest.fixture
def test_setup(db):
    recruiter = User.objects.create_user(
        email="rec_admin_test@example.com",
        password="Password123!",
        role=Role.RECRUITER,
    )
    company = Company.objects.create(
        name="Quantum Nexus",
        admin_user=recruiter,
        verification_status=CompanyVerificationStatus.APPROVED,
    )
    job1 = Job.objects.create(
        company=company,
        created_by=recruiter,
        job_title="Lead Architect",
        job_status=JobStatus.PUBLISHED,
    )
    job2 = Job.objects.create(
        company=company,
        created_by=recruiter,
        job_title="Junior Analyst",
        job_status=JobStatus.DRAFT,
    )
    # Add a report on job1
    Report.objects.create(
        target_type="job",
        target_id=job1.id,
        reason="Suspicious posting",
    )
    return {"job1": job1, "job2": job2, "company": company, "recruiter": recruiter}


@pytest.mark.django_db
def test_admin_list_jobs_and_metrics(admin_user, test_setup):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    res = client.get("/api/v1/admin/jobs/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["count"] == 2
    metrics = res.data["metrics"]
    assert metrics["total_listings"] == 2
    assert metrics["active_listings"] == 1
    assert metrics["draft_listings"] == 1
    assert metrics["reported_listings"] == 1

    # Filter by reported
    res_reported = client.get("/api/v1/admin/jobs/?status=reported")
    assert res_reported.data["count"] == 1
    assert res_reported.data["results"][0]["job_title"] == "Lead Architect"


@pytest.mark.django_db
def test_admin_update_status_and_flag(admin_user, test_setup):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    job1 = test_setup["job1"]

    # 1. Place on hold
    res_hold = client.patch(
        f"/api/v1/admin/jobs/{job1.id}/status/",
        {"status": "on_hold", "reason": "Under policy review"},
        format="json",
    )
    assert res_hold.status_code == status.HTTP_200_OK
    job1.refresh_from_db()
    assert job1.job_status == JobStatus.ON_HOLD
    assert job1.on_hold_reason == "Under policy review"

    # 2. Flag job
    res_flag = client.post(
        f"/api/v1/admin/jobs/{job1.id}/flag/",
        {"reason": "Misleading salary range", "description": "Reported by several users."},
        format="json",
    )
    assert res_flag.status_code == status.HTTP_201_CREATED
    assert res_flag.data["reason"] == "Misleading salary range"


@pytest.mark.django_db
def test_admin_internal_notes(admin_user, test_setup):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    job1 = test_setup["job1"]

    # Post a note
    res_post = client.post(
        f"/api/v1/admin/jobs/{job1.id}/notes/",
        {"note_text": "Spoke with recruiter; verification documents re-confirmed."},
        format="json",
    )
    assert res_post.status_code == status.HTTP_201_CREATED
    assert res_post.data["note_text"] == "Spoke with recruiter; verification documents re-confirmed."

    # List notes
    res_list = client.get(f"/api/v1/admin/jobs/{job1.id}/notes/")
    assert res_list.status_code == status.HTTP_200_OK
    assert len(res_list.data) == 1


@pytest.mark.django_db
def test_non_admin_forbidden_from_admin_endpoints(candidate_user, test_setup):
    client = APIClient()
    client.force_authenticate(user=candidate_user)

    res = client.get("/api/v1/admin/jobs/")
    assert res.status_code == status.HTTP_403_FORBIDDEN

