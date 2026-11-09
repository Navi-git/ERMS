"""Tests for Jobs models and DB schema compliance."""
import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import (
    EmploymentType,
    EntityNote,
    Job,
    JobBenefit,
    JobSkill,
    JobStage,
    JobStatus,
    Report,
    SavedJob,
    StageType,
    ViewEvent,
)
from apps.master_data.models import MasterDataItem
from shared.constants.roles import Role


@pytest.fixture
def recruiter_user(db):
    return User.objects.create_user(
        email="recruiter_test@example.com",
        password="Password123!",
        role=Role.RECRUITER,
        full_name="Recruiter Jane",
    )


@pytest.fixture
def test_company(db, recruiter_user):
    return Company.objects.create(
        name="Acme Corp",
        admin_user=recruiter_user,
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def skill_python(db):
    return MasterDataItem.objects.create(category="skill", key="python", value="Python")


@pytest.fixture
def test_job(db, test_company, recruiter_user):
    return Job.objects.create(
        company=test_company,
        created_by=recruiter_user,
        job_title="Senior Python Engineer",
        job_description="Build world-class APIs with Django.",
        job_status=JobStatus.PUBLISHED,
        is_draft=False,
        employment_type=EmploymentType.FULL_TIME,
        openings=2,
    )


@pytest.mark.django_db
def test_job_model_fields_and_defaults(test_job):
    assert test_job._meta.db_table == "jobs"
    assert test_job.job_title == "Senior Python Engineer"
    assert test_job.openings == 2
    assert test_job.job_status == JobStatus.PUBLISHED
    assert not test_job.is_draft
    assert not test_job.is_expired


@pytest.mark.django_db
def test_job_benefit_model(test_job):
    benefit = JobBenefit.objects.create(
        job=test_job,
        benefit_name="Comprehensive Health Coverage",
        custom_description="100% employer paid medical, dental, and vision.",
    )
    assert benefit._meta.db_table == "job_benefits"
    assert benefit.is_active is True
    assert benefit.job == test_job


@pytest.mark.django_db
def test_job_skill_model(test_job, skill_python):
    js = JobSkill.objects.create(
        job=test_job,
        skill=skill_python,
        is_required=True,
        proficiency_level="advanced",
    )
    assert js._meta.db_table == "job_skills"
    assert js.skill == skill_python
    assert js.proficiency_level == "advanced"


@pytest.mark.django_db
def test_job_stage_model(test_job):
    stage = JobStage.objects.create(
        job=test_job,
        name="Screening Call",
        stage_order=1,
        stage_type=StageType.SCREENING,
        is_required=True,
        is_active=True,
    )
    assert stage._meta.db_table == "job_stages"
    assert stage.stage_type == StageType.SCREENING
    assert stage.stage_order == 1


@pytest.mark.django_db
def test_report_and_view_event_and_notes(test_job, recruiter_user):
    report = Report.objects.create(
        reporter=recruiter_user,
        target_type="job",
        target_id=test_job.id,
        reason="Misleading compensation",
    )
    assert report._meta.db_table == "reports"

    view = ViewEvent.objects.create(
        viewer=recruiter_user,
        entity_type="job",
        entity_id=test_job.id,
    )
    assert view._meta.db_table == "view_events"

    note = EntityNote.objects.create(
        entity_type="job",
        entity_id=test_job.id,
        note_text="Reviewed salary benchmarks; aligns with industry standards.",
        added_by=recruiter_user,
        is_internal=True,
    )
    assert note._meta.db_table == "entity_notes"

