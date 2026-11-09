"""Tests for Recruiter Job endpoints and services."""
from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import EmploymentType, Job, JobBenefit, JobSkill, JobStage, JobStatus
from apps.master_data.models import MasterDataItem
from shared.constants.roles import Role


@pytest.fixture
def recruiter_user(db):
    user = User.objects.create_user(
        email="recruiter_main@example.com",
        password="Password123!",
        role=Role.RECRUITER,
        full_name="Alex Recruiter",
    )
    return user


@pytest.fixture
def other_recruiter(db):
    user = User.objects.create_user(
        email="other_recruiter@example.com",
        password="Password123!",
        role=Role.RECRUITER,
        full_name="Bob Other",
    )
    return user


@pytest.fixture
def approved_company(db, recruiter_user):
    return Company.objects.create(
        name="Nexus Technologies",
        admin_user=recruiter_user,
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def pending_company(db, other_recruiter):
    return Company.objects.create(
        name="Startup X",
        admin_user=other_recruiter,
        verification_status=CompanyVerificationStatus.PENDING,
    )


@pytest.fixture
def taxonomy(db):
    cat = MasterDataItem.objects.create(category="job_category", key="software_eng", value="Software Engineering")
    dept = MasterDataItem.objects.create(category="department", key="engineering", value="Engineering")
    exp = MasterDataItem.objects.create(category="experience_level", key="senior", value="Senior (5+ yrs)")
    work = MasterDataItem.objects.create(category="work_mode", key="remote", value="Remote")
    skill1 = MasterDataItem.objects.create(category="skill", key="react", value="React")
    skill2 = MasterDataItem.objects.create(category="skill", key="typescript", value="TypeScript")
    return {
        "category": cat,
        "department": dept,
        "experience": exp,
        "work_mode": work,
        "skill1": skill1,
        "skill2": skill2,
    }


@pytest.mark.django_db
def test_create_job_draft_and_auto_seed_stages(recruiter_user, approved_company, taxonomy):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    payload = {
        "job_title": "Full Stack Lead",
        "job_category_id": taxonomy["category"].id,
        "department_id": taxonomy["department"].id,
        "experience_level_id": taxonomy["experience"].id,
        "employment_type": EmploymentType.FULL_TIME,
        "work_mode_id": taxonomy["work_mode"].id,
        "location": "Remote, US",
        "openings": 2,
    }

    res = client.post("/api/v1/recruiter/jobs/", payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    job_id = res.data["id"]

    job = Job.objects.get(id=job_id)
    assert job.job_status == JobStatus.DRAFT
    assert job.is_draft is True
    assert job.company == approved_company
    assert job.created_by == recruiter_user

    # Verify auto-seeded stages (4 stages)
    stages = job.stages.all().order_by("stage_order")
    assert stages.count() == 4
    stage_names = [s.name for s in stages]
    assert stage_names == ["Applied", "Screening", "Technical Interview", "Offer"]


@pytest.mark.django_db
def test_recruiter_list_and_filter_jobs(recruiter_user, approved_company):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    # Create 1 draft, 1 published
    Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="Draft Dev",
        job_status=JobStatus.DRAFT,
        is_draft=True,
    )
    Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="Active Lead",
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
    )

    # 1. List all
    res = client.get("/api/v1/recruiter/jobs/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["count"] == 2
    assert res.data["summary"]["total_jobs"] == 2
    assert res.data["summary"]["active_jobs"] == 1
    assert res.data["summary"]["draft_jobs"] == 1

    # 2. Filter drafts
    res_drafts = client.get("/api/v1/recruiter/jobs/?status=draft")
    assert res_drafts.data["count"] == 1
    assert res_drafts.data["results"][0]["job_title"] == "Draft Dev"

    # 3. Filter active
    res_active = client.get("/api/v1/recruiter/jobs/?status=active")
    assert res_active.data["count"] == 1
    assert res_active.data["results"][0]["job_title"] == "Active Lead"


@pytest.mark.django_db
def test_delete_draft_vs_cannot_delete_published(recruiter_user, approved_company):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    draft = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="To Delete",
        job_status=JobStatus.DRAFT,
        is_draft=True,
    )
    published = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="To Keep",
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
    )

    # Deleting draft succeeds
    res_del_draft = client.delete(f"/api/v1/recruiter/jobs/{draft.id}/")
    assert res_del_draft.status_code == status.HTTP_204_NO_CONTENT
    assert not Job.objects.filter(id=draft.id).exists()

    # Deleting published is blocked
    res_del_pub = client.delete(f"/api/v1/recruiter/jobs/{published.id}/")
    assert res_del_pub.status_code == status.HTTP_400_BAD_REQUEST
    assert res_del_pub.data["code"] == "cannot_delete_non_draft"
    assert Job.objects.filter(id=published.id).exists()


@pytest.mark.django_db
def test_publish_workflow_validations(recruiter_user, approved_company, pending_company, other_recruiter, taxonomy):
    client = APIClient()

    # 1. Unverified company cannot publish
    client.force_authenticate(user=other_recruiter)
    unverified_job = Job.objects.create(
        company=pending_company,
        created_by=other_recruiter,
        job_title="Backend Eng",
        job_status=JobStatus.DRAFT,
        is_draft=True,
    )
    res_unverified = client.post(f"/api/v1/recruiter/jobs/{unverified_job.id}/publish/")
    assert res_unverified.status_code == status.HTTP_400_BAD_REQUEST
    assert res_unverified.data["code"] == "company_not_verified"

    # 2. Approved company with incomplete fields cannot publish
    client.force_authenticate(user=recruiter_user)
    job = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="Senior Frontend Engineer",
        job_status=JobStatus.DRAFT,
        is_draft=True,
    )
    res_incomplete = client.post(f"/api/v1/recruiter/jobs/{job.id}/publish/")
    assert res_incomplete.status_code == status.HTTP_400_BAD_REQUEST
    assert res_incomplete.data["code"] == "incomplete_job"

    # 3. Fill in all required fields and publish successfully
    job.job_description = "We are looking for a Senior Frontend Engineer."
    job.job_category = taxonomy["category"]
    job.department = taxonomy["department"]
    job.experience_level = taxonomy["experience"]
    job.employment_type = EmploymentType.FULL_TIME
    job.work_mode = taxonomy["work_mode"]
    job.location = "Remote, US"
    job.salary_min = 120000
    job.salary_max = 160000
    job.application_deadline = timezone.now() + timedelta(days=30)
    job.save()

    # Add required skill & active stage
    JobSkill.objects.create(job=job, skill=taxonomy["skill1"], is_required=True)
    JobStage.objects.create(job=job, name="Screening", stage_order=1, is_required=True, is_active=True)

    res_pub = client.post(f"/api/v1/recruiter/jobs/{job.id}/publish/")
    assert res_pub.status_code == status.HTTP_200_OK
    job.refresh_from_db()
    assert job.job_status == JobStatus.PUBLISHED
    assert job.is_draft is False
    assert job.published_at is not None


@pytest.mark.django_db
def test_hold_resume_close_mark_filled(recruiter_user, approved_company):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    job = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="DevOps Engineer",
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
        application_deadline=timezone.now() + timedelta(days=20),
    )

    # 1. Put on hold
    res_hold = client.post(f"/api/v1/recruiter/jobs/{job.id}/hold/", {"reason": "Hiring freeze"}, format="json")
    assert res_hold.status_code == status.HTTP_200_OK
    job.refresh_from_db()
    assert job.job_status == JobStatus.ON_HOLD
    assert job.on_hold_reason == "Hiring freeze"

    # 2. Resume
    res_resume = client.post(f"/api/v1/recruiter/jobs/{job.id}/resume/")
    assert res_resume.status_code == status.HTTP_200_OK
    job.refresh_from_db()
    assert job.job_status == JobStatus.PUBLISHED
    assert job.on_hold_reason is None

    # 3. Close
    res_close = client.post(f"/api/v1/recruiter/jobs/{job.id}/close/")
    assert res_close.status_code == status.HTTP_200_OK
    job.refresh_from_db()
    assert job.job_status == JobStatus.CLOSED
    assert job.closed_at is not None

    # 4. Mark filled
    res_filled = client.post(f"/api/v1/recruiter/jobs/{job.id}/mark-filled/")
    assert res_filled.status_code == status.HTTP_200_OK
    job.refresh_from_db()
    assert job.filled_at is not None


@pytest.mark.django_db
def test_skills_and_benefits_sync(recruiter_user, approved_company, taxonomy):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    job = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="React Architect",
    )

    # Sync skills
    skills_payload = [
        {"skill_id": taxonomy["skill1"].id, "is_required": True, "proficiency_level": "expert"},
        {"skill_id": taxonomy["skill2"].id, "is_required": False, "proficiency_level": "intermediate"},
    ]
    res_skills = client.put(f"/api/v1/recruiter/jobs/{job.id}/skills/", skills_payload, format="json")
    assert res_skills.status_code == status.HTTP_200_OK
    assert len(res_skills.data) == 2
    assert job.skills.count() == 2

    # Sync benefits
    benefits_payload = [
        {"benefit_name": "Flexible PTO", "custom_description": "Take time off when you need", "is_active": True},
        {"benefit_name": "401(k) Match", "custom_description": "Up to 5% match", "is_active": True},
    ]
    res_benefits = client.put(f"/api/v1/recruiter/jobs/{job.id}/benefits/", benefits_payload, format="json")
    assert res_benefits.status_code == status.HTTP_200_OK
    assert len(res_benefits.data) == 2
    assert job.benefits.count() == 2


@pytest.mark.django_db
def test_stages_crud_and_reorder(recruiter_user, approved_company):
    client = APIClient()
    client.force_authenticate(user=recruiter_user)

    job = Job.objects.create(
        company=approved_company,
        created_by=recruiter_user,
        job_title="QA Engineer",
    )

    # Create stage
    res_create = client.post(
        f"/api/v1/recruiter/jobs/{job.id}/stages/",
        {"name": "Initial Screening", "stage_type": "screening", "is_required": True},
        format="json",
    )
    assert res_create.status_code == status.HTTP_201_CREATED
    stage1_id = res_create.data["id"]

    res_create2 = client.post(
        f"/api/v1/recruiter/jobs/{job.id}/stages/",
        {"name": "Take-Home Assignment", "stage_type": "custom", "is_required": False},
        format="json",
    )
    assert res_create2.status_code == status.HTTP_201_CREATED
    stage2_id = res_create2.data["id"]

    # Reorder
    res_reorder = client.post(
        f"/api/v1/recruiter/jobs/{job.id}/stages/reorder/",
        {"stage_ids": [stage2_id, stage1_id]},
        format="json",
    )
    assert res_reorder.status_code == status.HTTP_200_OK
    assert res_reorder.data[0]["id"] == stage2_id
    assert res_reorder.data[0]["stage_order"] == 1
    assert res_reorder.data[1]["id"] == stage1_id
    assert res_reorder.data[1]["stage_order"] == 2

