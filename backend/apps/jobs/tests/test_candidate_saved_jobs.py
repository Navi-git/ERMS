"""Tests for Candidate Saved Jobs and Reporting."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import Job, JobStatus, Report, SavedJob
from apps.master_data.models import MasterDataItem
from shared.constants.roles import Role


@pytest.fixture
def candidate_user(db):
    user = User.objects.create_user(
        email="candidate_saver@example.com",
        password="Password123!",
        role=Role.CANDIDATE,
        full_name="Saved Candidate",
    )
    CandidateProfile.objects.create(user=user)
    return user


@pytest.fixture
def company(db):
    recruiter = User.objects.create_user(
        email="company_rec@example.com",
        password="Password123!",
        role=Role.RECRUITER,
    )
    return Company.objects.create(
        name="TechGlobal Lab",
        admin_user=recruiter,
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def test_job(db, company):
    recruiter = company.admin_user
    work_rem = MasterDataItem.objects.create(category="work_mode", key="remote", value="Remote")
    return Job.objects.create(
        company=company,
        created_by=recruiter,
        job_title="Senior Product Designer",
        job_status=JobStatus.PUBLISHED,
        work_mode=work_rem,
        salary_min=140000,
        salary_max=175000,
    )


@pytest.mark.django_db
def test_candidate_save_and_unsave_job(candidate_user, test_job):
    client = APIClient()
    client.force_authenticate(user=candidate_user)

    # 1. Save job
    res_save = client.post(f"/api/v1/candidate/saved-jobs/{test_job.id}/")
    assert res_save.status_code == status.HTTP_200_OK
    assert res_save.data["saved"] is True
    assert SavedJob.objects.filter(candidate=candidate_user.candidate_profile, job=test_job).exists()

    # 2. List saved jobs
    res_list = client.get("/api/v1/candidate/saved-jobs/")
    assert res_list.status_code == status.HTTP_200_OK
    assert res_list.data["count"] == 1
    assert res_list.data["results"][0]["job"]["job_title"] == "Senior Product Designer"

    # 3. Explicit delete
    res_del = client.delete(f"/api/v1/candidate/saved-jobs/{test_job.id}/")
    assert res_del.status_code == status.HTTP_204_NO_CONTENT
    assert not SavedJob.objects.filter(candidate=candidate_user.candidate_profile, job=test_job).exists()

    # 4. Toggle back on
    res_toggle_on = client.post(f"/api/v1/candidate/saved-jobs/{test_job.id}/")
    assert res_toggle_on.data["saved"] is True
    # Toggle off
    res_toggle_off = client.post(f"/api/v1/candidate/saved-jobs/{test_job.id}/")
    assert res_toggle_off.data["saved"] is False


@pytest.mark.django_db
def test_candidate_report_job(candidate_user, test_job):
    client = APIClient()
    client.force_authenticate(user=candidate_user)

    payload = {
        "reason": "Scam or Fraudulent Listing",
        "description": "Asked for upfront fee during application process.",
    }
    res = client.post(f"/api/v1/jobs/{test_job.id}/report/", payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data["reason"] == "Scam or Fraudulent Listing"

    # Verify Report row
    report = Report.objects.filter(target_type="job", target_id=test_job.id).first()
    assert report is not None
    assert report.reporter == candidate_user
    assert report.reason == "Scam or Fraudulent Listing"

