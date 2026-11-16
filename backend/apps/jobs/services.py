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


def sync_job_stages(job: Job, stages_data: list[dict]) -> list[JobStage]:
    """Synchronizes pipeline stages for a job (create, update, reorder, delete/deactivate)."""
    if not stages_data:
        return list(job.stages.all())

    existing_stages = {s.id: s for s in job.stages.all()}
    kept_stage_ids = set()
    result = []

    for idx, s_data in enumerate(stages_data, start=1):
        s_id = s_data.get("id")
        name = (s_data.get("name") or f"Stage {idx}").strip()
        stage_type = s_data.get("stage_type", StageType.CUSTOM)
        description = s_data.get("description", "")
        is_required = s_data.get("is_required", True)
        is_active = s_data.get("is_active", True)
        order = s_data.get("stage_order", idx)

        if stage_type not in StageType.values:
            stage_type = StageType.CUSTOM

        # Valid existing stage
        if s_id and s_id in existing_stages:
            stage = existing_stages[s_id]
            stage.name = name
            stage.stage_type = stage_type
            stage.description = description
            stage.is_required = is_required
            stage.is_active = is_active
            stage.stage_order = order
            stage.save()
            kept_stage_ids.add(s_id)
            result.append(stage)
        else:
            # New custom stage
            stage = JobStage.objects.create(
                job=job,
                name=name,
                stage_type=stage_type,
                stage_order=order,
                description=description,
                is_required=is_required,
                is_active=is_active,
            )
            kept_stage_ids.add(stage.id)
            result.append(stage)

    # Clean up removed stages
    for s_id, old_stage in existing_stages.items():
        if s_id not in kept_stage_ids:
            if old_stage.application_progresses.exists():
                old_stage.is_active = False
                old_stage.save(update_fields=["is_active"])
            else:
                old_stage.delete()

    return result


@transaction.atomic
def create_job_draft(user, validated_data: dict) -> Job:
    """Creates a new job draft and seeds its default or custom stages."""
    stages_data = validated_data.pop("stages", None)

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

    if stages_data:
        sync_job_stages(job, stages_data)
    else:
        seed_default_job_stages(job)

    return job


@transaction.atomic
def update_job(job: Job, validated_data: dict) -> Job:
    """Updates job fields and synchronizes stages if provided."""
    stages_data = validated_data.pop("stages", None)

    for key, value in validated_data.items():
        setattr(job, key, value)

    if job.is_draft:
        job.draft_saved_at = timezone.now()

    job.save()

    if stages_data is not None:
        sync_job_stages(job, stages_data)

    return job


def publish_job(job: Job) -> Job:
    """Enforces Decision #3 publish checks and marks job published."""
    # 1. Company verification check (Approved or undergoing Reverification)
    if job.company.verification_status not in [
        CompanyVerificationStatus.APPROVED,
        CompanyVerificationStatus.REVERIFICATION,
    ]:
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
    """Synchronizes required and optional skills for a job, auto-provisioning custom skills in master data."""
    from django.utils.text import slugify
    from apps.master_data.models import SkillAliasRelation

    job.skills.all().delete()
    new_skills = []
    seen_skill_ids = set()

    for item in skills_data:
        skill_id = item.get("skill_id")
        skill_name = (item.get("skill_name") or "").strip()

        master_item = None
        if skill_id:
            master_item = MasterDataItem.objects.filter(id=skill_id, category="skill", is_active=True).first()

        if not master_item and skill_name:
            # Check alias relation first
            alias_rel = SkillAliasRelation.objects.filter(alias_text__iexact=skill_name).first()
            if alias_rel:
                master_item = alias_rel.target_skill
            else:
                # Check case-insensitive exact match
                master_item = MasterDataItem.objects.filter(category="skill", value__iexact=skill_name).first()
                if not master_item:
                    slug_key = slugify(skill_name)
                    if slug_key:
                        master_item = MasterDataItem.objects.filter(category="skill", key=slug_key).first()

                # If still not found, auto-create into MasterDataItem
                if not master_item:
                    slug_key = slugify(skill_name)
                    if not slug_key:
                        slug_key = skill_name.lower().replace(" ", "_")[:50]
                    base_key = slug_key
                    counter = 1
                    while MasterDataItem.objects.filter(category="skill", key=slug_key).exists():
                        slug_key = f"{base_key}_{counter}"
                        counter += 1

                    master_item = MasterDataItem.objects.create(
                        category="skill",
                        key=slug_key,
                        value=skill_name,
                        is_active=True,
                    )

        if not master_item:
            continue

        if master_item.id in seen_skill_ids:
            continue
        seen_skill_ids.add(master_item.id)

        new_skills.append(
            JobSkill(
                job=job,
                skill=master_item,
                is_required=item.get("is_required", True),
                proficiency_level=item.get("proficiency_level") or "intermediate",
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

