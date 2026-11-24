from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone
from shared.constants.roles import Role
from shared.exceptions.api import ApiError
from apps.companies.models import Company
from apps.candidates.models import CandidateProfile
from apps.jobs.models import JobStage, StageType
from apps.applications.models import Application, ApplicationStatus
from apps.notifications.models import NotificationType
from apps.notifications.services import notification_service
from ..models import Offer, OfferStatus, OfferAttachment, OfferLetterTemplate
from .letter_generator import (
    DEFAULT_OFFER_TEMPLATE,
    build_template_context,
    generate_offer_pdf,
    render_template_text,
)


def _get_recruiter_company(user) -> Company:
    if user.role != Role.RECRUITER and not getattr(user, "is_superuser", False):
        raise ApiError(
            code="recruiter_only",
            message="Only recruiters can access this resource.",
            status_code=403,
        )
    company = Company.objects.filter(admin_user=user).first()
    if not company and getattr(user, "company", None):
        company = user.company
    if not company:
        raise ApiError(
            code="company_not_found",
            message="No recruiter company profile linked.",
            status_code=404,
        )
    return company


def _get_candidate_profile(user):
    if getattr(user, "role", "") != Role.CANDIDATE and not getattr(user, "is_superuser", False):
        raise ApiError(
            code="candidate_only",
            message="Only candidates can access this resource.",
            status_code=403,
        )
    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    return profile


class OfferService:
    """Core domain service for Offer formulation, dispatch, acceptance, and decline workflows."""

    @classmethod
    @transaction.atomic
    def create_or_update_draft(cls, recruiter_user, application_id: int, data: dict) -> Offer:
        company = _get_recruiter_company(recruiter_user)

        try:
            application = (
                Application.objects.select_related("job", "candidate__user", "job__company")
                .get(id=application_id, job__company=company)
            )
        except Application.DoesNotExist:
            raise ApiError(
                code="application_not_found",
                message="Application not found under your company.",
                status_code=404,
            )

        if application.application_status in [
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
            ApplicationStatus.ACCEPTED,
        ]:
            raise ApiError(
                code="invalid_application_state",
                message=f"Cannot formulate offer for an application with status '{application.application_status}'.",
                status_code=400,
            )

        active_sent = Offer.objects.filter(
            application=application, status=OfferStatus.SENT
        ).first()
        if active_sent:
            raise ApiError(
                code="active_offer_exists",
                message="An active formal offer has already been sent to this candidate. You must withdraw it before creating a new one.",
                status_code=400,
            )

        # Retrieve existing draft or initialize new one
        offer = Offer.objects.filter(
            application=application, status=OfferStatus.DRAFT
        ).first()
        if not offer:
            offer = Offer(
                application=application,
                created_by=recruiter_user,
                status=OfferStatus.DRAFT,
            )

        # Populate basic compensation
        if "salary" in data:
            offer.salary = int(data["salary"])
        elif not offer.salary:
            offer.salary = 0

        offer.currency = data.get("currency", offer.currency or "USD")
        offer.employment_type = data.get("employment_type", offer.employment_type)
        offer.pay_frequency = data.get("pay_frequency", offer.pay_frequency)
        offer.start_date = data.get("start_date", offer.start_date)

        # Populate equity & bonus
        offer.equity_type = data.get("equity_type", offer.equity_type)
        offer.equity_units = data.get("equity_units", offer.equity_units)
        offer.equity_vesting_schedule = data.get("equity_vesting_schedule", offer.equity_vesting_schedule)

        offer.bonus_type = data.get("bonus_type", offer.bonus_type)
        offer.bonus_target_percent = data.get("bonus_target_percent", offer.bonus_target_percent)
        offer.bonus_target_amount = data.get("bonus_target_amount", offer.bonus_target_amount)

        offer.sign_on_bonus = data.get("sign_on_bonus", offer.sign_on_bonus)
        offer.sign_on_bonus_terms = data.get("sign_on_bonus_terms", offer.sign_on_bonus_terms)

        # Reporting Line
        reports_to_id = data.get("reports_to_user_id")
        if reports_to_id:
            offer.reports_to_user_id = reports_to_id
        offer.reporting_manager_name = data.get("reporting_manager_name", offer.reporting_manager_name)
        offer.reporting_manager_title = data.get("reporting_manager_title", offer.reporting_manager_title)
        offer.department = data.get("department", offer.department or application.job.department)
        offer.work_arrangement = data.get("work_arrangement", offer.work_arrangement)

        # Critical dates
        start_d = data.get("start_date")
        if start_d:
            if isinstance(start_d, str):
                try:
                    from datetime import date as d_cls
                    offer.start_date = d_cls.fromisoformat(start_d[:10])
                except Exception:
                    offer.start_date = None
            else:
                offer.start_date = start_d

        exp_date = data.get("expiration_date")
        if exp_date:
            if isinstance(exp_date, str):
                try:
                    from datetime import date as d_cls
                    offer.expiration_date = d_cls.fromisoformat(exp_date[:10])
                except Exception:
                    offer.expiration_date = (timezone.now() + timedelta(days=7)).date()
            else:
                offer.expiration_date = exp_date
        elif not offer.expiration_date:
            offer.expiration_date = (timezone.now() + timedelta(days=7)).date()

        # Letter template & letter content
        template_id = data.get("template_id")
        if template_id:
            template = OfferLetterTemplate.objects.filter(id=template_id, company=company).first()
            if template:
                offer.template = template

        if "letter_content" in data and data["letter_content"]:
            offer.letter_content = data["letter_content"]
        elif not offer.letter_content:
            context = build_template_context(offer)
            tpl = offer.template.body_template if offer.template else DEFAULT_OFFER_TEMPLATE
            offer.letter_content = render_template_text(tpl, context)

        offer.save()
        return offer

    @classmethod
    @transaction.atomic
    def send_offer(cls, recruiter_user, offer_id: int) -> Offer:
        company = _get_recruiter_company(recruiter_user)
        try:
            offer = (
                Offer.objects.select_related("application__job", "application__candidate__user", "application__job__company")
                .get(id=offer_id, application__job__company=company)
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

        if offer.status != OfferStatus.DRAFT:
            raise ApiError(
                code="cannot_send_non_draft",
                message=f"Only draft offers can be sent. Current status is '{offer.status}'.",
                status_code=400,
            )

        if not offer.salary or offer.salary <= 0:
            raise ApiError(code="invalid_salary", message="A valid base salary is required to send an offer.", status_code=400)

        if not offer.expiration_date:
            offer.expiration_date = (timezone.now() + timedelta(days=7)).date()

        if offer.expiration_date < timezone.now().date():
            raise ApiError(code="invalid_expiration", message="Offer expiration deadline must be in the future.", status_code=400)

        # Generate branded PDF document
        pdf_url = generate_offer_pdf(offer)
        offer.offer_document_url = pdf_url
        offer.status = OfferStatus.SENT
        offer.sent_at = timezone.now()
        offer.save(update_fields=["offer_document_url", "status", "sent_at", "updated_at"])

        # Sync Application status
        app = offer.application
        app.application_status = ApplicationStatus.OFFER_SENT
        app.offer_extended_at = timezone.now()
        app.save(update_fields=["application_status", "offer_extended_at", "updated_at"])

        # Move to 'offer' stage if present in pipeline
        offer_stage = JobStage.objects.filter(job=app.job, stage_type=StageType.OFFER).first()
        if offer_stage and hasattr(app, "stage_progress"):
            try:
                from apps.applications.services.transition_service import ApplicationTransitionService
                ApplicationTransitionService.move_stage(
                    app,
                    offer_stage.id,
                    changed_by=recruiter_user,
                    notes=f"Offer extended with annual compensation {offer.currency} {offer.salary:,}.",
                )
            except Exception:
                pass

        # Send live notification to candidate
        candidate_user = app.candidate.user
        job_title = getattr(app.job, "job_title", "Position")
        extra_data = {
            "offer_id": offer.id,
            "application_id": app.id,
            "job_title": job_title,
            "company_name": app.job.company.name,
            "salary": offer.salary,
            "currency": offer.currency,
            "expiration_date": str(offer.expiration_date),
            "offer_reference": offer.offer_reference,
        }

        try:
            notification_service.notify(
                user=candidate_user,
                notification_type=NotificationType.OFFER_SENT,
                title=f"Offer Extended: {job_title}",
                message=f"Congratulations! {app.job.company.name} has extended an official employment offer for {job_title}.",
                redirect_url=f"/candidate/applications/{app.id}/offer",
                source_type="offer",
                source_id=offer.id,
                extra=extra_data,
            )
        except Exception:
            pass

        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                transaction.on_commit(
                    lambda: async_to_sync(channel_layer.group_send)(
                        f"user_{candidate_user.id}",
                        {"type": "notification.broadcast", "data": extra_data},
                    )
                )
        except Exception:
            pass

        return offer

    @classmethod
    @transaction.atomic
    def withdraw_offer(cls, recruiter_user, offer_id: int, reason: str = "") -> Offer:
        company = _get_recruiter_company(recruiter_user)
        try:
            offer = (
                Offer.objects.select_related("application__job", "application__candidate__user")
                .get(id=offer_id, application__job__company=company)
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

        if offer.status != OfferStatus.SENT:
            raise ApiError(
                code="cannot_withdraw",
                message=f"Only sent active offers can be withdrawn. Current status is '{offer.status}'.",
                status_code=400,
            )

        offer.status = OfferStatus.WITHDRAWN
        offer.withdrawn_at = timezone.now()
        offer.withdrawn_reason = reason.strip() if reason else "Withdrawn by hiring team."
        offer.save(update_fields=["status", "withdrawn_at", "withdrawn_reason", "updated_at"])

        # Reset application status back to interview_scheduled so recruiter can revise
        app = offer.application
        if app.application_status == ApplicationStatus.OFFER_SENT:
            app.application_status = ApplicationStatus.INTERVIEW_SCHEDULED
            app.save(update_fields=["application_status", "updated_at"])

        # Notify candidate
        job_title = getattr(app.job, "job_title", "Position")
        try:
            notification_service.notify(
                user=app.candidate.user,
                notification_type=NotificationType.OFFER_WITHDRAWN,
                title=f"Offer Withdrawn: {job_title}",
                message=f"The employment offer for {job_title} at {app.job.company.name} has been withdrawn by the hiring team.",
                redirect_url=f"/candidate/applications/{app.id}",
                source_type="offer",
                source_id=offer.id,
                extra={"offer_id": offer.id, "reason": offer.withdrawn_reason},
            )
        except Exception:
            pass

        return offer

    @classmethod
    @transaction.atomic
    def accept_offer(cls, candidate_user, offer_id: int) -> Offer:
        profile = _get_candidate_profile(candidate_user)
        try:
            offer = (
                Offer.objects.select_related("application__job__company", "application__candidate__user")
                .get(id=offer_id, application__candidate=profile)
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

        if offer.status != OfferStatus.SENT:
            raise ApiError(
                code="cannot_accept",
                message=f"Offer cannot be accepted. Current status is '{offer.status}'.",
                status_code=400,
            )

        if offer.is_expired:
            offer.status = OfferStatus.EXPIRED
            offer.save(update_fields=["status", "updated_at"])
            raise ApiError(
                code="offer_expired",
                message="This offer has passed its expiration deadline and can no longer be accepted.",
                status_code=400,
            )

        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])

        # Sync Application -> ACCEPTED / HIRED
        app = offer.application
        app.application_status = ApplicationStatus.ACCEPTED
        app.hired_at = timezone.now()
        app.save(update_fields=["application_status", "hired_at", "updated_at"])

        # Advance to HIRED stage if configured on job
        hired_stage = JobStage.objects.filter(job=app.job, stage_type=StageType.HIRED).first()
        if hired_stage:
            try:
                from apps.applications.services.transition_service import ApplicationTransitionService
                ApplicationTransitionService.move_stage(
                    app,
                    hired_stage.id,
                    changed_by=candidate_user,
                    notes="Candidate accepted formal employment offer.",
                )
            except Exception:
                pass

        job_title = getattr(app.job, "job_title", "Position")
        # Candidate Notification
        try:
            notification_service.notify(
                user=candidate_user,
                notification_type=NotificationType.OFFER_ACCEPTED,
                title=f"Offer Accepted: {job_title}",
                message=f"Congratulations! Your acceptance of the offer for {job_title} at {app.job.company.name} is confirmed. The team will be in touch with onboarding details.",
                redirect_url=f"/candidate/applications/{app.id}/offer",
                source_type="offer",
                source_id=offer.id,
            )
        except Exception:
            pass

        # Recruiter Notification
        recruiter_admin = app.job.company.admin_user or offer.created_by
        try:
            notification_service.notify(
                user=recruiter_admin,
                notification_type=NotificationType.OFFER_ACCEPTED,
                title=f"Offer Accepted: {candidate_user.full_name}",
                message=f"{candidate_user.full_name} has accepted the offer for {job_title} ({offer.currency} {offer.salary:,}/yr).",
                redirect_url=f"/recruiter/applications/{app.id}",
                source_type="offer",
                source_id=offer.id,
            )
        except Exception:
            pass

        # Check openings fill count
        accepted_count = Application.objects.filter(
            job=app.job, application_status=ApplicationStatus.ACCEPTED
        ).count()
        openings_total = getattr(app.job, "openings", 1)
        if openings_total and accepted_count >= openings_total:
            try:
                notification_service.notify(
                    user=recruiter_admin,
                    notification_type=NotificationType.APPLICATION_STATUS_CHANGED,
                    title=f"Job Openings Reached: {job_title}",
                    message=f"All {openings_total} openings for '{job_title}' have accepted offers. You can now close or archive this requisition.",
                    redirect_url=f"/recruiter/jobs/{app.job.id}",
                    source_type="job",
                    source_id=app.job.id,
                )
            except Exception:
                pass

        return offer

    @classmethod
    @transaction.atomic
    def decline_offer(cls, candidate_user, offer_id: int, decline_reason: str = None, candidate_feedback: str = None) -> Offer:
        profile = _get_candidate_profile(candidate_user)
        try:
            offer = (
                Offer.objects.select_related("application__job__company", "application__candidate__user")
                .get(id=offer_id, application__candidate=profile)
            )
        except Offer.DoesNotExist:
            raise ApiError(code="offer_not_found", message="Offer not found.", status_code=404)

        if offer.status != OfferStatus.SENT:
            raise ApiError(
                code="cannot_decline",
                message=f"Offer cannot be declined. Current status is '{offer.status}'.",
                status_code=400,
            )

        offer.status = OfferStatus.DECLINED
        offer.declined_at = timezone.now()
        offer.responded_at = timezone.now()
        offer.decline_reason = decline_reason or "Other"
        offer.candidate_feedback = candidate_feedback or ""
        offer.save(update_fields=["status", "declined_at", "responded_at", "decline_reason", "candidate_feedback", "updated_at"])

        # Sync Application -> DECLINED
        app = offer.application
        app.application_status = ApplicationStatus.DECLINED
        app.save(update_fields=["application_status", "updated_at"])

        job_title = getattr(app.job, "job_title", "Position")
        # Recruiter Notification
        recruiter_admin = app.job.company.admin_user or offer.created_by
        try:
            notification_service.notify(
                user=recruiter_admin,
                notification_type=NotificationType.OFFER_DECLINED,
                title=f"Offer Declined: {candidate_user.full_name}",
                message=f"{candidate_user.full_name} has declined the offer for {job_title}. Reason: {offer.decline_reason}.",
                redirect_url=f"/recruiter/applications/{app.id}",
                source_type="offer",
                source_id=offer.id,
                extra={"decline_reason": offer.decline_reason, "feedback": offer.candidate_feedback},
            )
        except Exception:
            pass

        return offer

    @classmethod
    def expire_pending_offers(cls) -> int:
        """Sweeps database and marks overdue sent offers as expired."""
        now_date = timezone.now().date()
        expired_qs = Offer.objects.filter(status=OfferStatus.SENT, expiration_date__lt=now_date)
        count = 0
        for offer in expired_qs:
            offer.status = OfferStatus.EXPIRED
            offer.save(update_fields=["status", "updated_at"])
            count += 1
        return count
