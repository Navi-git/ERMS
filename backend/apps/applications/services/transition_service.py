from django.db import transaction
from django.utils import timezone
from shared.exceptions.api import ApiError
from apps.jobs.models import Job, JobStatus, JobStage, StageType
from apps.candidates.models import CandidateProfile, Resume
from apps.companies.models import CompanyVerificationStatus
from apps.applications.models import (
    Application,
    ApplicationStatus,
    ApplicationStageProgress,
    ApplicationMaterial,
)


class ApplicationTransitionService:
    """Manages application lifecycle transitions, stage movements, and audit records."""

    @classmethod
    @transaction.atomic
    def apply_to_job(
        cls,
        candidate_user,
        job_id: int,
        resume_id: int = None,
        linkedin_url: str = None,
        portfolio_url: str = None,
        message_to_hiring_manager: str = None,
        cover_letter: str = None,
        source: str = "direct",
        materials: list = None,
    ) -> Application:
        """Candidate submits an application to a published job."""
        if getattr(candidate_user, "role", "") != "candidate":
            raise ApiError(
                code="candidate_role_required",
                message="Only candidate accounts can submit job applications.",
                status_code=403,
            )

        if not getattr(candidate_user, "is_email_verified", True):
            raise ApiError(
                code="email_not_verified",
                message="Your email must be verified before submitting applications.",
                status_code=403,
            )

        try:
            job = Job.objects.select_related("company").get(id=job_id)
        except Job.DoesNotExist:
            raise ApiError(code="job_not_found", message="Job not found.", status_code=404)

        if job.job_status != JobStatus.PUBLISHED or job.is_expired:
            raise ApiError(
                code="job_closed",
                message="This job requisition is no longer accepting applications.",
                status_code=400,
            )

        if (
            job.company.verification_status != CompanyVerificationStatus.APPROVED
            or job.company.suspended_at
        ):
            raise ApiError(
                code="company_not_verified",
                message="Applications cannot be accepted for unverified companies.",
                status_code=400,
            )

        profile, _ = CandidateProfile.objects.get_or_create(user=candidate_user)

        # Duplicate application check
        if Application.objects.filter(job=job, candidate=profile).exists():
            raise ApiError(
                code="duplicate_application",
                message="You have already applied for this position.",
                status_code=400,
            )

        # Resume resolution (Decision #8)
        resume = None
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, candidate=profile, archived_at__isnull=True)
            except Resume.DoesNotExist:
                raise ApiError(
                    code="invalid_resume",
                    message="Selected resume does not exist or is archived.",
                    status_code=400,
                )
        else:
            # Fall back to default active resume
            resume = Resume.objects.filter(candidate=profile, is_default=True, archived_at__isnull=True).first()
            if not resume:
                resume = Resume.objects.filter(candidate=profile, archived_at__isnull=True).first()

        if not resume:
            raise ApiError(
                code="resume_required",
                message="Please upload a resume before applying.",
                status_code=400,
            )

        # Create application
        application = Application.objects.create(
            candidate=profile,
            job=job,
            resume=resume,
            linkedin_url=linkedin_url or getattr(profile, "linkedin_url", ""),
            portfolio_url=portfolio_url or getattr(profile, "portfolio_url", ""),
            message_to_hiring_manager=message_to_hiring_manager or "",
            cover_letter=cover_letter or "",
            source=source or "direct",
            application_status=ApplicationStatus.APPLIED,
            applied_at=timezone.now(),
        )

        # Initialize initial job stage
        first_stage = (
            JobStage.objects.filter(job=job)
            .order_by("stage_order", "id")
            .first()
        )
        if not first_stage:
            # Create default applied stage for job if none existed
            first_stage = JobStage.objects.create(
                job=job,
                name="Applied",
                stage_type=StageType.APPLIED,
                stage_order=1,
            )

        ApplicationStageProgress.objects.create(
            application=application,
            job_stage=first_stage,
            started_at=timezone.now(),
            notes="Application submitted by candidate.",
        )

        # Materials handling
        if materials:
            if len(materials) > 5:
                raise ApiError(
                    code="max_materials_exceeded",
                    message="A maximum of 5 supplemental materials may be attached.",
                    status_code=400,
                )
            for mat in materials:
                ApplicationMaterial.objects.create(
                    application=application,
                    file_name=mat.get("file_name", "Material"),
                    file_url=mat.get("file_url", ""),
                    file_type=mat.get("file_type", "other"),
                )

        return application

    @classmethod
    def record_first_review(cls, application: Application, recruiter_user):
        """Sets reviewed_at/reviewed_by and transitions 'applied' to 'reviewing' (Decision #5)."""
        updates = []
        if not application.reviewed_at:
            application.reviewed_at = timezone.now()
            application.reviewed_by = recruiter_user
            updates.extend(["reviewed_at", "reviewed_by"])

        if application.application_status == ApplicationStatus.APPLIED:
            application.application_status = ApplicationStatus.REVIEWING
            updates.append("application_status")

        if updates:
            application.updated_at = timezone.now()
            updates.append("updated_at")
            application.save(update_fields=updates)

    @classmethod
    @transaction.atomic
    def move_stage(
        cls,
        application: Application,
        target_stage_id: int,
        changed_by,
        notes: str = "",
    ) -> ApplicationStageProgress:
        """Recruiter moves candidate to any active job stage (forward or back)."""
        try:
            target_stage = JobStage.objects.get(id=target_stage_id, job=application.job)
        except JobStage.DoesNotExist:
            raise ApiError(
                code="invalid_stage",
                message="Target hiring stage does not belong to this job.",
                status_code=400,
            )

        # Close current open stage progress
        current_progress = (
            ApplicationStageProgress.objects.filter(
                application=application,
                completed_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )
        if current_progress:
            current_progress.completed_at = timezone.now()
            current_progress.save(update_fields=["completed_at"])

        # Create new stage progress
        new_progress = ApplicationStageProgress.objects.create(
            application=application,
            job_stage=target_stage,
            started_at=timezone.now(),
            changed_by=changed_by,
            notes=notes,
        )

        # Dynamic status updates based on stage type
        status_updates = []
        if (
            target_stage.stage_type == StageType.SCREENING
            and application.application_status == ApplicationStatus.APPLIED
        ):
            application.application_status = ApplicationStatus.REVIEWING
            status_updates.append("application_status")
        elif target_stage.stage_type == StageType.INTERVIEW:
            application.application_status = ApplicationStatus.INTERVIEW_SCHEDULED
            status_updates.append("application_status")
        elif target_stage.stage_type == StageType.OFFER:
            application.application_status = ApplicationStatus.OFFER_SENT
            if not application.offer_extended_at:
                application.offer_extended_at = timezone.now()
                status_updates.append("offer_extended_at")
            status_updates.append("application_status")
        elif target_stage.stage_type == StageType.HIRED:
            application.application_status = ApplicationStatus.ACCEPTED
            if not application.hired_at:
                application.hired_at = timezone.now()
                status_updates.append("hired_at")
            status_updates.append("application_status")

        if status_updates:
            application.updated_at = timezone.now()
            status_updates.append("updated_at")
            application.save(update_fields=status_updates)

        return new_progress

    @classmethod
    def shortlist(cls, application: Application, recruiter_user) -> Application:
        """Recruiter moves candidate to shortlisted status."""
        application.application_status = ApplicationStatus.SHORTLISTED
        application.updated_at = timezone.now()
        application.save(update_fields=["application_status", "updated_at"])
        return application

    @classmethod
    @transaction.atomic
    def reject(cls, application: Application, recruiter_user, rejection_reason: str) -> Application:
        """Recruiter rejects application with reason (visible to candidate per Decision #7)."""
        if not rejection_reason or not rejection_reason.strip():
            raise ApiError(
                code="rejection_reason_required",
                message="A rejection reason must be provided.",
                status_code=400,
            )

        application.application_status = ApplicationStatus.REJECTED
        application.rejected_at = timezone.now()
        application.rejection_reason = rejection_reason.strip()
        application.updated_at = timezone.now()
        application.save(
            update_fields=["application_status", "rejected_at", "rejection_reason", "updated_at"]
        )

        # Close any open stage progress
        ApplicationStageProgress.objects.filter(
            application=application,
            completed_at__isnull=True,
        ).update(completed_at=timezone.now())

        return application

    @classmethod
    @transaction.atomic
    def withdraw(cls, application: Application, candidate_user) -> Application:
        """Candidate withdraws from the hiring process (Decision #1)."""
        if application.candidate.user_id != candidate_user.id:
            raise ApiError(
                code="permission_denied",
                message="You can only withdraw your own applications.",
                status_code=403,
            )

        if application.application_status in [
            ApplicationStatus.WITHDRAWN,
            ApplicationStatus.REJECTED,
        ]:
            raise ApiError(
                code="already_finalized",
                message="Application is already closed or withdrawn.",
                status_code=400,
            )

        application.application_status = ApplicationStatus.WITHDRAWN
        application.withdrawn_at = timezone.now()
        application.updated_at = timezone.now()
        application.save(update_fields=["application_status", "withdrawn_at", "updated_at"])

        # Close current stage progress
        ApplicationStageProgress.objects.filter(
            application=application,
            completed_at__isnull=True,
        ).update(completed_at=timezone.now(), notes="Withdrawn by candidate.")

        return application

    @classmethod
    @transaction.atomic
    def hire(cls, application: Application, recruiter_user) -> Application:
        """Recruiter marks applicant as hired (Decision #9: allowed without prior formal offer)."""
        application.application_status = ApplicationStatus.ACCEPTED
        application.hired_at = timezone.now()
        application.updated_at = timezone.now()
        application.save(update_fields=["application_status", "hired_at", "updated_at"])

        # Advance to hired stage if exists on job
        hired_stage = JobStage.objects.filter(
            job=application.job, stage_type=StageType.HIRED
        ).first()
        if hired_stage:
            cls.move_stage(
                application,
                hired_stage.id,
                changed_by=recruiter_user,
                notes="Candidate marked as hired by recruiter.",
            )

        return application
