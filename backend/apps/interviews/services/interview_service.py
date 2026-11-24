from datetime import timedelta
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from shared.exceptions.api import ApiError
from shared.constants.roles import Role
from apps.accounts.models import AuditLog, User
from apps.applications.models import Application, ApplicationStatus, ApplicationStageProgress
from apps.jobs.models import Job, JobStage
from apps.notifications.models import NotificationType
from apps.notifications.services import notification_service
from ..models import (
    Interview,
    InterviewParticipant,
    InterviewFeedback,
    InterviewFeedbackCriteria,
    InterviewStatus,
    InterviewType,
    ParticipantType,
    ParticipantRole,
    ResponseStatus,
    Recommendation,
)
from .calendar_service import generate_ics_calendar


class InterviewService:
    """Core domain service for interview scheduling, lifecycle transitions, invitations, and scorecards."""

    @classmethod
    @transaction.atomic
    def schedule_interview(
        cls,
        recruiter_user,
        application_id: int,
        interview_type: str,
        scheduled_at,
        duration_minutes: int = 60,
        meeting_link: str = None,
        location: str = None,
        invitation_note: str = None,
        job_stage_id: int = None,
        participants_data: list = None,
    ) -> tuple[Interview, list[str]]:
        """Schedules a new interview round, registers participants, sends notifications and calendar invites."""
        try:
            application = Application.objects.select_related("job", "job__company", "candidate__user").get(
                id=application_id
            )
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        company = application.job.company
        if recruiter_user.role != Role.SUPER_ADMIN and company.admin_user_id != recruiter_user.id:
            # Check company affiliation
            if getattr(recruiter_user, "company_id", None) != company.id:
                raise ApiError(code="permission_denied", message="You cannot schedule interviews for this requisition.", status_code=403)

        if application.application_status in [ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]:
            raise ApiError(
                code="invalid_application_state",
                message=f"Cannot schedule interview for application in '{application.application_status}' state.",
                status_code=400,
            )

        duration = int(duration_minutes) if duration_minutes else 60
        end_time = scheduled_at + timedelta(minutes=duration)

        # Double-booking check (Warning only)
        warnings = []
        candidate_overlap = Interview.objects.filter(
            application__candidate=application.candidate,
            interview_status=InterviewStatus.SCHEDULED,
            scheduled_at__lt=end_time,
        ).exclude(scheduled_at__gte=end_time).first()
        if candidate_overlap:
            warnings.append(
                f"Candidate already has another interview scheduled at {candidate_overlap.scheduled_at.strftime('%Y-%m-%d %H:%M UTC')}."
            )

        # Job stage resolution
        job_stage = None
        if job_stage_id:
            job_stage = JobStage.objects.filter(id=job_stage_id, job=application.job).first()

        # If job_stage is not an interview stage or was omitted, resolve to job's interview stage
        if not job_stage or getattr(job_stage, "stage_type", None) != "interview":
            interview_stage = JobStage.objects.filter(job=application.job, stage_type="interview").order_by("stage_order").first()
            if interview_stage:
                job_stage = interview_stage

        # Create Interview record
        interview = Interview.objects.create(
            application=application,
            job=application.job,
            scheduled_by=recruiter_user,
            job_stage=job_stage,
            interview_type=interview_type or InterviewType.TECHNICAL,
            scheduled_at=scheduled_at,
            duration_minutes=duration,
            meeting_link=(meeting_link or "").strip() or None,
            location=(location or "").strip() or None,
            invitation_note=(invitation_note or "").strip() or None,
            interview_status=InterviewStatus.SCHEDULED,
        )

        # 1. Add Candidate participant
        InterviewParticipant.objects.create(
            interview=interview,
            user=application.candidate.user,
            participant_type=ParticipantType.CANDIDATE,
            participant_role=ParticipantRole.CANDIDATE,
            response_status=ResponseStatus.INVITED,
            invitation_sent_at=timezone.now(),
        )

        # 2. Add Host Recruiter participant
        InterviewParticipant.objects.create(
            interview=interview,
            user=recruiter_user,
            participant_type=ParticipantType.INTERVIEWER,
            participant_role=ParticipantRole.LEAD,
            response_status=ResponseStatus.ACCEPTED,
            invitation_sent_at=timezone.now(),
        )

        # 3. Add Other Attendees / Panelists (Team or External)
        if participants_data:
            for p_info in participants_data:
                user_id = p_info.get("user_id")
                ext_name = (p_info.get("external_name") or "").strip()
                ext_email = (p_info.get("external_email") or "").strip()
                p_role = p_info.get("participant_role") or ParticipantRole.PANELIST

                if user_id:
                    if int(user_id) == recruiter_user.id:
                        continue  # Host already added
                    panelist_user = User.objects.filter(id=user_id).first()
                    if panelist_user:
                        InterviewParticipant.objects.create(
                            interview=interview,
                            user=panelist_user,
                            participant_type=ParticipantType.INTERVIEWER,
                            participant_role=p_role,
                            response_status=ResponseStatus.INVITED,
                            invitation_sent_at=timezone.now(),
                        )
                elif ext_email:
                    InterviewParticipant.objects.create(
                        interview=interview,
                        user=None,
                        participant_type=ParticipantType.INTERVIEWER,
                        participant_role=p_role,
                        external_name=ext_name or "Guest Panelist",
                        external_email=ext_email,
                        response_status=ResponseStatus.INVITED,
                        invitation_sent_at=timezone.now(),
                    )

        # Update application status to interview_scheduled
        status_updates = []
        if application.application_status != ApplicationStatus.INTERVIEW_SCHEDULED:
            application.application_status = ApplicationStatus.INTERVIEW_SCHEDULED
            status_updates.append("application_status")
        if application.offer_extended_at:
            application.offer_extended_at = None
            status_updates.append("offer_extended_at")
        if status_updates:
            application.updated_at = timezone.now()
            status_updates.append("updated_at")
            application.save(update_fields=status_updates)

        # Update or record stage progress safely (handles re-entering stage without get_or_create MultipleObjectsReturned)
        if job_stage:
            active_prog = ApplicationStageProgress.objects.filter(
                application=application,
                job_stage=job_stage,
                completed_at__isnull=True,
            ).first()
            if not active_prog:
                # Close any other open stage progress (e.g. if application was in offer stage)
                ApplicationStageProgress.objects.filter(
                    application=application,
                    completed_at__isnull=True,
                ).update(completed_at=timezone.now())

                ApplicationStageProgress.objects.create(
                    application=application,
                    job_stage=job_stage,
                    started_at=timezone.now(),
                    changed_by=recruiter_user,
                    notes=f"Interview scheduled: {interview.get_interview_type_display()}.",
                )

        # Audit log
        AuditLog.objects.create(
            actor=recruiter_user,
            actor_type="recruiter",
            action="interview.scheduled",
            entity_type="interview",
            entity_id=interview.id,
            details={
                "application_id": application.id,
                "job_title": application.job.job_title,
                "scheduled_at": scheduled_at.isoformat(),
                "duration_minutes": duration,
                "interview_type": interview.interview_type,
            },
        )

        # Trigger in-app notification & WebSocket update to candidate
        cls._send_scheduling_notifications(interview)

        # Send calendar emails to candidate and all panelists
        cls._send_calendar_invitations(interview, sequence=0)

        return interview, warnings

    @classmethod
    @transaction.atomic
    def reschedule_interview(
        cls,
        user,
        interview_id: int,
        new_scheduled_at,
        new_duration_minutes: int = None,
        new_meeting_link: str = None,
        new_location: str = None,
        reason: str = None,
    ) -> Interview:
        """Reschedules an interview and notifies all attendees with an updated calendar invite."""
        interview = cls._get_interview_for_mutation(interview_id, user)

        old_dt = interview.scheduled_at
        old_duration = interview.duration_minutes

        interview.scheduled_at = new_scheduled_at
        if new_duration_minutes:
            interview.duration_minutes = int(new_duration_minutes)
        if new_meeting_link is not None:
            interview.meeting_link = new_meeting_link.strip() or None
        if new_location is not None:
            interview.location = new_location.strip() or None
        interview.updated_at = timezone.now()
        interview.save(
            update_fields=["scheduled_at", "duration_minutes", "meeting_link", "location", "updated_at"]
        )

        AuditLog.objects.create(
            actor=user,
            actor_type=getattr(user, "role", "user"),
            action="interview.rescheduled",
            entity_type="interview",
            entity_id=interview.id,
            old_values={"scheduled_at": old_dt.isoformat(), "duration_minutes": old_duration},
            new_values={
                "scheduled_at": interview.scheduled_at.isoformat(),
                "duration_minutes": interview.duration_minutes,
                "reason": reason,
            },
        )

        # Notify candidate
        candidate_user = interview.application.candidate.user
        notification_service.notify(
            user=candidate_user,
            notification_type=NotificationType.INTERVIEW_RESCHEDULED,
            title=f"Interview Rescheduled: {interview.get_interview_type_display()}",
            message=f"Your interview for {interview.job.job_title} has been moved to {interview.scheduled_at.strftime('%b %d, %Y at %I:%M %p UTC')}.",
            redirect_url=f"/candidate/interviews",
            source_type="interview",
            source_id=interview.id,
            extra={
                "interview_id": interview.id,
                "scheduled_at": interview.scheduled_at.isoformat(),
                "duration_minutes": interview.duration_minutes,
            },
        )

        cls._send_calendar_invitations(interview, sequence=1, is_update=True)
        return interview

    @classmethod
    @transaction.atomic
    def cancel_interview(cls, user, interview_id: int, reason: str) -> Interview:
        """Cancels a scheduled interview and alerts participants."""
        interview = cls._get_interview_for_mutation(interview_id, user)
        if interview.interview_status == InterviewStatus.CANCELLED:
            raise ApiError(code="already_cancelled", message="Interview is already cancelled.", status_code=400)

        interview.interview_status = InterviewStatus.CANCELLED
        interview.cancellation_reason = (reason or "").strip() or "Cancelled by user"
        interview.cancelled_at = timezone.now()
        interview.cancelled_by = user
        interview.updated_at = timezone.now()
        interview.save(
            update_fields=["interview_status", "cancellation_reason", "cancelled_at", "cancelled_by", "updated_at"]
        )

        AuditLog.objects.create(
            actor=user,
            actor_type=getattr(user, "role", "user"),
            action="interview.cancelled",
            entity_type="interview",
            entity_id=interview.id,
            details={"cancellation_reason": interview.cancellation_reason},
        )

        # Notify candidate if cancelled by recruiter
        candidate_user = interview.application.candidate.user
        if user.id != candidate_user.id:
            notification_service.notify(
                user=candidate_user,
                notification_type=NotificationType.INTERVIEW_CANCELLED,
                title=f"Interview Cancelled: {interview.get_interview_type_display()}",
                message=f"Your interview for {interview.job.job_title} was cancelled: {interview.cancellation_reason}",
                redirect_url=f"/candidate/interviews",
                source_type="interview",
                source_id=interview.id,
                extra={"interview_id": interview.id, "reason": interview.cancellation_reason},
            )

        cls._send_calendar_invitations(interview, sequence=2, is_cancel=True)
        return interview

    @classmethod
    @transaction.atomic
    def mark_outcome(cls, recruiter_user, interview_id: int, outcome: str, notes: str = None) -> Interview:
        """Marks interview as completed or no-show."""
        interview = cls._get_interview_for_mutation(interview_id, recruiter_user)

        if outcome == "completed":
            interview.interview_status = InterviewStatus.COMPLETED
            interview.updated_at = timezone.now()
            interview.save(update_fields=["interview_status", "updated_at"])
        elif outcome == "no_show":
            interview.interview_status = InterviewStatus.NO_SHOW
            interview.cancellation_reason = (notes or "").strip() or "Candidate marked as no-show."
            interview.updated_at = timezone.now()
            interview.save(update_fields=["interview_status", "cancellation_reason", "updated_at"])
        else:
            raise ApiError(code="invalid_outcome", message="Outcome must be 'completed' or 'no_show'.", status_code=400)

        AuditLog.objects.create(
            actor=recruiter_user,
            actor_type="recruiter",
            action=f"interview.outcome.{outcome}",
            entity_type="interview",
            entity_id=interview.id,
            details={"outcome": outcome, "notes": notes},
        )
        return interview

    @classmethod
    @transaction.atomic
    def submit_scorecard(
        cls,
        recruiter_user,
        interview_id: int,
        recommendation: str,
        overall_score: float = None,
        rating: int = None,
        technical_score: int = None,
        communication_score: int = None,
        comments: str = None,
        growth_areas: str = None,
        internal_notes: str = None,
        on_behalf_of_participant_id: int = None,
        criteria_ratings: list = None,
    ) -> InterviewFeedback:
        """Submits interview evaluation and per-criterion scorecard ratings."""
        try:
            interview = Interview.objects.select_related("job", "job__company", "application").get(id=interview_id)
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        # Proxy check
        on_behalf_participant = None
        if on_behalf_of_participant_id:
            on_behalf_participant = InterviewParticipant.objects.filter(
                id=on_behalf_of_participant_id, interview=interview
            ).first()
            if not on_behalf_participant:
                raise ApiError(
                    code="participant_not_found",
                    message="The designated panelist does not belong to this interview.",
                    status_code=400,
                )

        # Prevent duplicate scorecard for same participant
        duplicate_check = InterviewFeedback.objects.filter(
            interview=interview,
            on_behalf_of_participant=on_behalf_participant,
        )
        if not on_behalf_participant:
            duplicate_check = duplicate_check.filter(submitted_by=recruiter_user)

        if duplicate_check.exists():
            raise ApiError(
                code="scorecard_already_submitted",
                message="A scorecard has already been submitted for this evaluator on this interview.",
                status_code=400,
            )

        # Calculate scores if criteria passed
        calc_overall = overall_score
        if criteria_ratings and len(criteria_ratings) > 0 and calc_overall is None:
            valid_scores = [c.get("score") for c in criteria_ratings if c.get("score") is not None]
            if valid_scores:
                calc_overall = round(sum(valid_scores) / len(valid_scores), 1)

        feedback = InterviewFeedback.objects.create(
            interview=interview,
            submitted_by=recruiter_user,
            on_behalf_of_participant=on_behalf_participant,
            recommendation=recommendation or Recommendation.YES,
            rating=rating or (int(round(calc_overall)) if calc_overall else None),
            technical_score=technical_score,
            communication_score=communication_score,
            overall_score=calc_overall,
            comments=(comments or "").strip() or None,
            growth_areas=(growth_areas or "").strip() or None,
            internal_notes=(internal_notes or "").strip() or None,
            submitted_at=timezone.now(),
        )

        # Insert detailed criteria
        if criteria_ratings:
            for idx, item in enumerate(criteria_ratings):
                InterviewFeedbackCriteria.objects.create(
                    feedback=feedback,
                    criterion_key=item.get("criterion_key", f"crit_{idx}"),
                    criterion_label=item.get("criterion_label", f"Criterion {idx+1}"),
                    criterion_description=item.get("criterion_description", ""),
                    benchmark_level=item.get("benchmark_level", ""),
                    score=int(item.get("score", 3)),
                    max_score=int(item.get("max_score", 5)),
                    display_order=idx,
                )

        # Mark interview feedback_submitted = True and completed
        interview.feedback_submitted = True
        if interview.interview_status == InterviewStatus.SCHEDULED:
            interview.interview_status = InterviewStatus.COMPLETED
        interview.updated_at = timezone.now()
        interview.save(update_fields=["feedback_submitted", "interview_status", "updated_at"])

        AuditLog.objects.create(
            actor=recruiter_user,
            actor_type="recruiter",
            action="interview.scorecard_submitted",
            entity_type="interview_feedback",
            entity_id=feedback.id,
            details={
                "interview_id": interview.id,
                "recommendation": feedback.recommendation,
                "overall_score": feedback.overall_score,
                "is_proxy": on_behalf_participant is not None,
            },
        )
        return feedback

    @classmethod
    @transaction.atomic
    def update_scorecard(
        cls,
        recruiter_user,
        interview_id: int,
        recommendation: str = None,
        overall_score: float = None,
        rating: int = None,
        technical_score: int = None,
        communication_score: int = None,
        comments: str = None,
        growth_areas: str = None,
        internal_notes: str = None,
        on_behalf_of_participant_id: int = None,
        criteria_ratings: list = None,
    ) -> InterviewFeedback:
        """Updates an existing evaluation scorecard and criteria ratings."""
        try:
            interview = Interview.objects.get(id=interview_id)
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        feedback = interview.feedbacks.first()
        if not feedback:
            raise ApiError(code="feedback_not_found", message="No submitted scorecard found to update.", status_code=404)

        if recommendation:
            feedback.recommendation = recommendation
        if comments is not None:
            feedback.comments = comments.strip() or None
        if growth_areas is not None:
            feedback.growth_areas = growth_areas.strip() or None
        if internal_notes is not None:
            feedback.internal_notes = internal_notes.strip() or None
        if rating is not None:
            feedback.rating = rating
        if technical_score is not None:
            feedback.technical_score = technical_score
        if communication_score is not None:
            feedback.communication_score = communication_score

        if on_behalf_of_participant_id:
            on_behalf_participant = InterviewParticipant.objects.filter(
                id=on_behalf_of_participant_id, interview=interview
            ).first()
            if on_behalf_participant:
                feedback.on_behalf_of_participant = on_behalf_participant

        if criteria_ratings is not None:
            calc_overall = overall_score
            valid_scores = [c.get("score") for c in criteria_ratings if c.get("score") is not None]
            if valid_scores and calc_overall is None:
                calc_overall = round(sum(valid_scores) / len(valid_scores), 1)
            feedback.overall_score = calc_overall
            feedback.rating = int(round(calc_overall)) if calc_overall else feedback.rating

            feedback.criteria_ratings.all().delete()
            for idx, item in enumerate(criteria_ratings):
                InterviewFeedbackCriteria.objects.create(
                    feedback=feedback,
                    criterion_key=item.get("criterion_key", f"crit_{idx}"),
                    criterion_label=item.get("criterion_label", f"Criterion {idx+1}"),
                    criterion_description=item.get("criterion_description", ""),
                    benchmark_level=item.get("benchmark_level", ""),
                    score=int(item.get("score", 3)),
                    max_score=int(item.get("max_score", 5)),
                    display_order=idx,
                )

        feedback.updated_at = timezone.now()
        feedback.save()

        AuditLog.objects.create(
            actor=recruiter_user,
            actor_type="recruiter",
            action="interview.scorecard_updated",
            entity_type="interview_feedback",
            entity_id=feedback.id,
            details={"interview_id": interview.id, "recommendation": feedback.recommendation},
        )
        return feedback

    @classmethod
    def nudge_panelist(cls, recruiter_user, participant_id: int) -> InterviewParticipant:
        """Sends a nudge reminder to a panelist who has not submitted feedback."""
        try:
            participant = InterviewParticipant.objects.select_related("interview", "interview__job", "user").get(
                id=participant_id
            )
        except InterviewParticipant.DoesNotExist:
            raise ApiError(code="participant_not_found", message="Participant not found.", status_code=404)

        participant.nudge_count += 1
        participant.last_nudged_at = timezone.now()
        participant.save(update_fields=["nudge_count", "last_nudged_at"])

        target_email = participant.email
        if target_email:
            try:
                subject = f"Reminder: Scorecard pending for {participant.interview.application.candidate.user.full_name}"
                body = (
                    f"Hi {participant.display_name},\n\n"
                    f"Please submit your scorecard feedback for the recent {participant.interview.get_interview_type_display()} "
                    f"with {participant.interview.application.candidate.user.full_name} for the position '{participant.interview.job.job_title}'.\n\n"
                    f"Thank you,\nTalentBridge Hiring Team"
                )
                msg = EmailMultiAlternatives(subject, body, None, [target_email])
                msg.send(fail_silently=True)
            except Exception:
                pass

        return participant

    @classmethod
    def candidate_respond(cls, candidate_user, interview_id: int, response_status: str, notes: str = None) -> InterviewParticipant:
        """Candidate confirms RSVP (accepted) or declines."""
        if response_status not in [ResponseStatus.ACCEPTED, ResponseStatus.DECLINED]:
            raise ApiError(code="invalid_response_status", message="Status must be 'accepted' or 'declined'.", status_code=400)

        try:
            participant = InterviewParticipant.objects.select_related("interview", "interview__job").get(
                interview_id=interview_id,
                user=candidate_user,
                participant_type=ParticipantType.CANDIDATE,
            )
        except InterviewParticipant.DoesNotExist:
            raise ApiError(code="participant_not_found", message="Candidate participation record not found.", status_code=404)

        participant.response_status = response_status
        participant.save(update_fields=["response_status"])

        # Notify recruiter
        recruiter = participant.interview.scheduled_by
        status_label = "confirmed attendance" if response_status == ResponseStatus.ACCEPTED else "declined the invitation"
        try:
            notification_service.notify(
                user=recruiter,
                notification_type=NotificationType.INTERVIEW_SCHEDULED,
                title=f"Candidate RSVP: {candidate_user.full_name}",
                message=f"{candidate_user.full_name} has {status_label} for {participant.interview.get_interview_type_display()}." + (f" Note: {notes}" if notes else ""),
                redirect_url=f"/recruiter/interviews",
                source_type="interview",
                source_id=interview_id,
            )
        except Exception:
            pass

        return participant

    # =========================================================================
    # Internal Helpers
    # =========================================================================

    @classmethod
    def _get_interview_for_mutation(cls, interview_id: int, user) -> Interview:
        try:
            interview = Interview.objects.select_related("job", "job__company", "application", "application__candidate__user").get(
                id=interview_id
            )
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        if user.role != Role.SUPER_ADMIN:
            company = interview.job.company
            if company.admin_user_id != user.id and getattr(user, "company_id", None) != company.id:
                if user.id != interview.application.candidate.user_id:
                    raise ApiError(code="permission_denied", message="Access denied.", status_code=403)
        return interview

    @classmethod
    def _send_scheduling_notifications(cls, interview: Interview):
        candidate_user = interview.application.candidate.user
        job = interview.job
        extra = {
            "interview_id": interview.id,
            "interview_type": interview.interview_type,
            "scheduled_at": interview.scheduled_at.isoformat(),
            "duration_minutes": interview.duration_minutes,
            "meeting_link": interview.meeting_link,
            "location": interview.location,
        }

        try:
            notification_service.notify(
                user=candidate_user,
                notification_type=NotificationType.INTERVIEW_SCHEDULED,
                title=f"Interview Scheduled: {interview.get_interview_type_display()}",
                message=f"You have an interview scheduled for {job.job_title} at {job.company.name} on {interview.scheduled_at.strftime('%b %d, %Y at %I:%M %p UTC')}.",
                redirect_url=f"/candidate/interviews",
                source_type="interview",
                source_id=interview.id,
                extra=extra,
            )
        except Exception:
            pass

        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                transaction.on_commit(
                    lambda: async_to_sync(channel_layer.group_send)(
                        f"user_{candidate_user.id}",
                        {"type": "application.update", "data": {"interview": extra, "application_status": "interview_scheduled"}},
                    )
                )
        except Exception:
            pass

    @classmethod
    def _send_calendar_invitations(cls, interview: Interview, sequence: int = 0, is_update: bool = False, is_cancel: bool = False):
        summary = f"{interview.get_interview_type_display()}: {interview.application.candidate.user.full_name} - {interview.job.job_title}"
        description = (
            f"Interview for {interview.job.job_title} at {interview.job.company.name}.\n\n"
            f"Candidate: {interview.application.candidate.user.full_name} ({interview.application.candidate.user.email})\n"
            f"Round: {interview.get_interview_type_display()}\n"
            f"Duration: {interview.duration_minutes} minutes\n"
            + (f"\nNotes from Recruiter: {interview.invitation_note}\n" if interview.invitation_note else "")
        )

        participants = interview.participants.all()
        for p in participants:
            email = p.email
            name = p.display_name
            if not email:
                continue

            try:
                ics_content = generate_ics_calendar(
                    interview_id=interview.id,
                    summary=summary,
                    description=description,
                    start_dt=interview.scheduled_at,
                    end_dt=interview.end_time,
                    location=interview.location or "",
                    meeting_link=interview.meeting_link or "",
                    organizer_name=f"{interview.job.company.name} Recruiting",
                    organizer_email=interview.scheduled_by.email,
                    attendee_name=name,
                    attendee_email=email,
                    status="CANCELLED" if is_cancel else "CONFIRMED",
                    sequence=sequence,
                )

                subject_prefix = "[Updated] " if is_update else ("[Cancelled] " if is_cancel else "")
                subject = f"{subject_prefix}Interview: {summary}"
                msg = EmailMultiAlternatives(subject, description, None, [email])
                msg.attach(
                    f"invite-{interview.id}.ics",
                    ics_content,
                    "text/calendar; method=REQUEST; charset=UTF-8",
                )
                msg.send(fail_silently=True)
            except Exception:
                pass
