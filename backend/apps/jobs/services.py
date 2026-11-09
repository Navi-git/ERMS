"""Domain services for Jobs module (business rules, stage seeding, status transitions, quota hook)."""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import (
    EntityNote,
    Job,
    JobBenefit,
    JobSkill,
    JobStage,
    JobStatus,
    Report,
    ReportStatus,
    SavedJob,
    StageType,
    ViewEvent,
)
from apps.master_data.models import MasterDataItem
from shared.exceptions.api import ApiError


def calculate_job_completion(job: Job) -> tuple[int, list[str]]:
    """Calculates percentage completion (0-100) and returns a list of missing items."""
    missing = []
    checks = [
        (bool(job.job_title and job.job_title.strip()), "Job Title"),
        (bool(job.job_category_id), "Job Category"),
        (bool(job.department_id), "Department"),
        (bool(job.experience_level_id), "Experience Level"),
        (bool(job.employment_type), "Employment Type"),
        (bool(job.work_mode_id), "Work Mode"),
        (bool(job.location and job.location.strip()), "Location"),
        (bool(job.job_description and job.job_description.strip()), "Job Description"),
        (bool(job.salary_min is not None and job.salary_max is not None), "Salary Range"),
        (bool(job.application_deadline and job.application_deadline > timezone.now()), "Application Deadline"),
        (job.skills.filter(is_required=True).exists(), "Required Skills (min 1)"),
        (job.stages.filter(is_active=True).exists(), "Active Hiring Stages (min 1)"),
    ]

    passed = 0
    for condition, label in checks:
        if condition:
            passed += 1
        else:
            missing.append(label)

    score = int(round((passed / len(checks)) * 100))
    return score, missing


def check_job_quota(company: Company) -> tuple[bool, str]:
    """Hook for Module 13 Subscription Quotas.

    Default: allow up to 2 free jobs or plan limits. No-op until Module 13.
    """
    return True, ""


def seed_default_job_stages(job: Job) -> list[JobStage]:
    """Auto-seeds standard 4-stage hiring pipeline for a new job."""
    defaults = [
        {
            "name": "Applied",
            "stage_order": 1,
            "stage_type": StageType.APPLIED,
            "description": "Candidate submits profile, resume, and application materials.",
            "is_required": True,
            "is_active": True,
        },
        {
            "name": "Screening",
            "stage_order": 2,
            "stage_type": StageType.SCREENING,
            "description": "Initial qualification alignment and resume screening.",
            "is_required": True,
            "is_active": True,
        },
        {
            "name": "Technical Interview",
            "stage_order": 3,
            "stage_type": StageType.INTERVIEW,
            "description": "System architecture, live critique, and domain problem solving.",
            "is_required": True,
            "is_active": True,
        },
        {
            "name": "Offer",
            "stage_order": 4,
            "stage_type": StageType.OFFER,
            "description": "Formal offer package extension and negotiation.",
            "is_required": True,
            "is_active": True,
        },
    ]

    stages = []
    for item in defaults:
        stages.append(JobStage.objects.create(job=job, **item))
    return stages


@transaction.atomic
def create_job_draft(user, validated_data: dict) -> Job:
    """Creates a new job draft and seeds its default stages."""
    company = Company.objects.filter(admin_user=user).first()
    if not company:
        raise ApiError(
            code="no_company_found",
            message="You must have an associated company to create jobs.",
            status_code=400,
        )

    allowed, quota_err = check_job_quota(company)
    if not allowed:
        raise ApiError(
            code="job_quota_exceeded",
            message=quota_err,
            status_code=403,
        )

    job = Job.objects.create(
        company=company,
        created_by=user,
        job_status=JobStatus.DRAFT,
        is_draft=True,
        draft_saved_at=timezone.now(),
        **validated_data,
    )

    seed_default_job_stages(job)
    return job


def update_job(job: Job, validated_data: dict) -> Job:
    """Updates job fields.

    Maintains draft status if currently a draft.
    """
    for key, value in validated_data.items():
        setattr(job, key, value)

    if job.is_draft:
        job.draft_saved_at = timezone.now()

    job.save()
    return job


def publish_job(job: Job) -> Job:
    """Enforces Decision #3 publish checks and marks job published."""
    # 1. Company verification check
    if job.company.verification_status != CompanyVerificationStatus.APPROVED:
        raise ApiError(
            code="company_not_verified",
            message="Your company profile must be verified and approved by an administrator before publishing jobs.",
            status_code=400,
        )

    if job.company.suspended_at is not None:
        raise ApiError(
            code="company_suspended",
            message="Your company account is currently suspended.",
            status_code=403,
        )

    # 2. Check completeness
    _, missing = calculate_job_completion(job)
    if missing:
        raise ApiError(
            code="incomplete_job",
            message=f"Cannot publish job. Please complete the following missing items: {', '.join(missing)}.",
            status_code=400,
        )

    # 3. Transition to published
    job.job_status = JobStatus.PUBLISHED
    job.is_draft = False
    job.published_at = timezone.now()
    job.on_hold_reason = None
    job.save()
    return job


def put_job_on_hold(job: Job, reason: str) -> Job:
    """Places a published job on hold with an optional reason."""
    if job.job_status not in [JobStatus.PUBLISHED, JobStatus.ON_HOLD]:
        raise ApiError(
            code="invalid_status_transition",
            message="Only published jobs can be put on hold.",
            status_code=400,
        )

    job.job_status = JobStatus.ON_HOLD
    job.on_hold_reason = reason or "Temporarily placed on hold by recruiter."
    job.save()
    return job


def resume_job(job: Job) -> Job:
    """Resumes an on-hold job back to published."""
    if job.job_status != JobStatus.ON_HOLD:
        raise ApiError(
            code="invalid_status_transition",
            message="Only on-hold jobs can be resumed.",
            status_code=400,
        )

    if job.application_deadline and job.application_deadline <= timezone.now():
        raise ApiError(
            code="expired_deadline",
            message="Cannot resume an expired job. Please update the application deadline first.",
            status_code=400,
        )

    job.job_status = JobStatus.PUBLISHED
    job.on_hold_reason = None
    job.save()
    return job


def close_job(job: Job) -> Job:
    """Closes an active or on-hold job."""
    if job.job_status == JobStatus.CLOSED:
        return job

    job.job_status = JobStatus.CLOSED
    job.closed_at = timezone.now()
    job.save()
    return job


def mark_job_filled(job: Job) -> Job:
    """Marks a job as filled and closed. Cannot be reopened."""
    job.job_status = JobStatus.CLOSED
    now = timezone.now()
    job.closed_at = now
    job.filled_at = now
    job.save()
    return job


def delete_job_draft(job: Job):
    """Deletes a job if and only if it is a draft (Decision #10)."""
    if not job.is_draft and job.job_status != JobStatus.DRAFT:
        raise ApiError(
            code="cannot_delete_non_draft",
            message="Only draft jobs can be deleted. Published, on-hold, or closed jobs cannot be deleted.",
            status_code=400,
        )
    job.delete()


@transaction.atomic
def sync_job_skills(job: Job, skills_data: list[dict]) -> list[JobSkill]:
    """Synchronizes required and optional skills for a job."""
    job.skills.all().delete()
    new_skills = []
    for item in skills_data:
        skill_id = item["skill_id"]
        master_item = MasterDataItem.objects.filter(id=skill_id, category="skill", is_active=True).first()
        if not master_item:
            raise ValidationError({"skills": f"Skill ID {skill_id} is invalid or inactive."})

        new_skills.append(
            JobSkill(
                job=job,
                skill=master_item,
                is_required=item.get("is_required", True),
                proficiency_level=item.get("proficiency_level"),
            )
        )
    return JobSkill.objects.bulk_create(new_skills)


@transaction.atomic
def sync_job_benefits(job: Job, benefits_data: list[dict]) -> list[JobBenefit]:
    """Synchronizes custom and selected perks/benefits for a job."""
    job.benefits.all().delete()
    new_benefits = []
    for item in benefits_data:
        benefit_name = item.get("benefit_name", "").strip()
        if not benefit_name:
            continue
        new_benefits.append(
            JobBenefit(
                job=job,
                benefit_name=benefit_name,
                custom_description=item.get("custom_description"),
                is_active=item.get("is_active", True),
            )
        )
    return JobBenefit.objects.bulk_create(new_benefits)


@transaction.atomic
def reorder_stages(job: Job, stage_ids: list[int]) -> list[JobStage]:
    """Reorders the stages for a job based on the ordered list of IDs."""
    stages = list(job.stages.filter(id__in=stage_ids))
    if len(stages) != len(stage_ids):
        raise ValidationError({"stage_ids": "One or more stage IDs do not belong to this job."})

    stage_map = {s.id: s for s in stages}
    updated = []
    for order, sid in enumerate(stage_ids, start=1):
        st = stage_map[sid]
        st.stage_order = order
        st.save(update_fields=["stage_order"])
        updated.append(st)
    return updated


def record_job_view(job: Job, user):
    """Records a view_events row on job detail page view (Decision #12 hook)."""
    try:
        viewer = user if user and user.is_authenticated else None
        ViewEvent.objects.create(
            viewer=viewer,
            entity_type="job",
            entity_id=job.id,
        )
    except Exception:
        # Non-blocking hook
        pass


def toggle_saved_job(candidate_user, job: Job) -> dict:
    """Saves or removes a bookmark for a candidate."""
    profile = getattr(candidate_user, "candidate_profile", None)
    if not profile:
        raise ApiError(
            code="no_candidate_profile",
            message="You must have a candidate profile to save jobs.",
            status_code=400,
        )

    existing = SavedJob.objects.filter(candidate=profile, job=job).first()
    if existing:
        existing.delete()
        return {"saved": False, "message": "Job removed from saved jobs."}

    SavedJob.objects.create(candidate=profile, job=job)
    return {"saved": True, "message": "Job saved successfully."}


def flag_job_for_review(job: Job, user, reason: str, description: str = "") -> Report:
    """Super Admin or User flags a job for moderation review (Decision #7)."""
    report = Report.objects.create(
        reporter=user if user and user.is_authenticated else None,
        target_type="job",
        target_id=job.id,
        reason=reason or "Inappropriate or fraudulent listing",
        title=f"Flagged Job: {job.job_title} at {job.company.name}",
        description=description,
        status=ReportStatus.PENDING,
    )
    return report

