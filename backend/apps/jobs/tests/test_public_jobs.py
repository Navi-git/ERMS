"""Tests for Public Job Search, Filtering, and Detail inspection."""
from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import EmploymentType, Job, JobStatus, SavedJob, ViewEvent
from apps.master_data.models import MasterDataItem
from shared.constants.roles import Role


@pytest.fixture
def recruiter_user(db):
    return User.objects.create_user(
        email="public_recruiter@example.com",
        password="Password123!",
        role=Role.RECRUITER,
        full_name="Sarah Jenkins",
    )


@pytest.fixture
def candidate_user(db):
    user = User.objects.create_user(
        email="public_candidate@example.com",
        password="Password123!",
        role=Role.CANDIDATE,
        full_name="Alex Seeker",
    )
    CandidateProfile.objects.create(user=user)
    return user


@pytest.fixture
def verified_company(db, recruiter_user):
    return Company.objects.create(
        name="Acme Tech Corp",
        admin_user=recruiter_user,
        verification_status=CompanyVerificationStatus.APPROVED,
        city="San Francisco",
        state="CA",
        country="United States",
    )


@pytest.fixture
def unverified_company(db, recruiter_user):
    return Company.objects.create(
        name="Unverified Corp",
        admin_user=recruiter_user,
        verification_status=CompanyVerificationStatus.PENDING,
    )


@pytest.fixture
def setup_jobs(db, verified_company, unverified_company, recruiter_user):
    cat_eng = MasterDataItem.objects.create(category="job_category", key="engineering", value="Software Engineering")
    cat_des = MasterDataItem.objects.create(category="job_category", key="design", value="Product Design")
    work_rem = MasterDataItem.objects.create(category="work_mode", key="remote", value="Remote")
    work_onsite = MasterDataItem.objects.create(category="work_mode", key="onsite", value="On-site")

    # 1. Active Published Job 1
    job1 = Job.objects.create(
        company=verified_company,
        created_by=recruiter_user,
        job_title="Senior Frontend Engineer",
        job_description="React and TypeScript guru needed for enterprise dashboard.",
        job_category=cat_eng,
        work_mode=work_rem,
        employment_type=EmploymentType.FULL_TIME,
        location="San Francisco, CA (Hybrid)",
        salary_min=140000,
        salary_max=180000,
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
        application_deadline=timezone.now() + timedelta(days=30),
        published_at=timezone.now() - timedelta(days=2),
    )

    # 2. Active Published Job 2
    job2 = Job.objects.create(
        company=verified_company,
        created_by=recruiter_user,
        job_title="Lead Product Designer",
        job_description="Design systems, Figma tokens, and user research.",
        job_category=cat_des,
        work_mode=work_onsite,
        employment_type=EmploymentType.FULL_TIME,
        location="New York, NY",
        salary_min=150000,
        salary_max=190000,
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
        application_deadline=timezone.now() + timedelta(days=15),
        published_at=timezone.now() - timedelta(days=5),
    )

    # 3. Expired Job (deadline in the past)
    Job.objects.create(
        company=verified_company,
        created_by=recruiter_user,
        job_title="Expired Backend Engineer",
        job_description="Old posting.",
        job_category=cat_eng,
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
        application_deadline=timezone.now() - timedelta(days=2),
    )

    # 4. Draft Job (should never be public)
    Job.objects.create(
        company=verified_company,
        created_by=recruiter_user,
        job_title="Secret AI Researcher",
        job_description="Incomplete draft.",
        job_status=JobStatus.DRAFT,
        is_draft=True,
    )

    # 5. Job from Unverified Company (should be hidden)
    Job.objects.create(
        company=unverified_company,
        created_by=recruiter_user,
        job_title="Unverified Job",
        job_description="Pending verification.",
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
    )

    return {"job1": job1, "job2": job2, "cat_eng": cat_eng, "cat_des": cat_des}


@pytest.mark.django_db
def test_public_job_list_filters_and_hides_ineligible(setup_jobs):
    client = APIClient()

    # 1. Base list: only 2 active verified jobs should appear
    res = client.get("/api/v1/jobs/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["count"] == 2
    titles = [j["job_title"] for j in res.data["results"]]
    assert "Senior Frontend Engineer" in titles
    assert "Lead Product Designer" in titles
    assert "Expired Backend Engineer" not in titles
    assert "Secret AI Researcher" not in titles
    assert "Unverified Job" not in titles

    # 2. Keyword search
    res_search = client.get("/api/v1/jobs/?q=React")
    assert res_search.data["count"] == 1
    assert res_search.data["results"][0]["job_title"] == "Senior Frontend Engineer"

    # 3. Category filter
    res_cat = client.get(f"/api/v1/jobs/?category={setup_jobs['cat_des'].id}")
    assert res_cat.data["count"] == 1
    assert res_cat.data["results"][0]["job_title"] == "Lead Product Designer"

    # 4. Location search
    res_loc = client.get("/api/v1/jobs/?location=New York")
    assert res_loc.data["count"] == 1
    assert res_loc.data["results"][0]["job_title"] == "Lead Product Designer"

    # 5. Salary sort (descending)
    res_sort = client.get("/api/v1/jobs/?sort=salary_desc")
    # job2 max is 190000, job1 max is 180000
    assert res_sort.data["results"][0]["job_title"] == "Lead Product Designer"


@pytest.mark.django_db
def test_public_job_detail_and_view_event(setup_jobs, candidate_user):
    client = APIClient()
    job1 = setup_jobs["job1"]

    # 1. Anonymous view records view event
    res = client.get(f"/api/v1/jobs/{job1.id}/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["job_title"] == "Senior Frontend Engineer"
    assert res.data["company"]["name"] == "Acme Tech Corp"
    assert res.data["is_saved"] is False

    # Check view event hook
    assert ViewEvent.objects.filter(entity_type="job", entity_id=job1.id).count() == 1

    # 2. Authenticated candidate view who saved the job
    profile = candidate_user.candidate_profile
    SavedJob.objects.create(candidate=profile, job=job1)

    client.force_authenticate(user=candidate_user)
    res_saved = client.get(f"/api/v1/jobs/{job1.id}/")
    assert res_saved.data["is_saved"] is True
    assert ViewEvent.objects.filter(entity_type="job", entity_id=job1.id).count() == 2


@pytest.mark.django_db
def test_company_active_jobs_list(setup_jobs, verified_company):
    client = APIClient()
    res = client.get(f"/api/v1/jobs/companies/{verified_company.id}/jobs/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["count"] == 2

