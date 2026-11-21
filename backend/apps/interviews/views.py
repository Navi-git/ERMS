from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from shared.exceptions.api import ApiError
from shared.constants.roles import Role
from apps.companies.models import Company
from apps.candidates.models import CandidateProfile
from apps.notifications.models import NotificationType
from apps.notifications.services import notification_service
from .models import (
    Interview,
    InterviewParticipant,
    InterviewFeedback,
    InterviewStatus,
    ParticipantType,
    ResponseStatus,
)
from .serializers import (
    RecruiterInterviewListSerializer,
    RecruiterScheduleInterviewSerializer,
    RescheduleInterviewSerializer,
    CancelInterviewSerializer,
    InterviewOutcomeSerializer,
    SubmitScorecardSerializer,
    InterviewFeedbackSerializer,
    CandidateInterviewSerializer,
)
from .services.interview_service import InterviewService


def _get_recruiter_company(user):
    if user.role != Role.RECRUITER and not getattr(user, "is_superuser", False):
        raise ApiError(code="recruiter_only", message="Only recruiters can access this resource.", status_code=403)
    company = Company.objects.filter(admin_user=user).first()
    if not company and getattr(user, "company", None):
        company = user.company
    if not company:
        raise ApiError(code="company_not_found", message="No recruiter company profile linked.", status_code=404)
    return company


def _get_candidate_profile(user):
    if user.role != Role.CANDIDATE:
        raise ApiError(code="candidate_only", message="Only candidates can access this resource.", status_code=403)
    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    return profile


# ==============================================================================
# Recruiter Interview Views
# ==============================================================================


class RecruiterInterviewListView(APIView):
    """GET /api/v1/recruiter/interviews/ - List scheduled and concluded interviews with filters."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = _get_recruiter_company(request.user)
        queryset = (
            Interview.objects.filter(job__company=company)
            .select_related("job", "application", "application__candidate__user", "scheduled_by")
            .prefetch_related("participants__user", "feedbacks__submitted_by", "feedbacks__criteria_ratings")
            .order_by("-scheduled_at")
        )

        # Filters
        job_id = request.query_params.get("job_id")
        if job_id:
            queryset = queryset.filter(job_id=job_id)

        application_id = request.query_params.get("application_id")
        if application_id:
            queryset = queryset.filter(application_id=application_id)

        status_param = request.query_params.get("status")
        if status_param:
            if status_param == "feedback_pending":
                queryset = queryset.filter(
                    interview_status=InterviewStatus.COMPLETED,
                    feedback_submitted=False,
                )
            else:
                queryset = queryset.filter(interview_status=status_param)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(application__candidate__user__full_name__icontains=search)
                | Q(application__candidate__user__email__icontains=search)
                | Q(job__job_title__icontains=search)
            )

        from_date = request.query_params.get("from_date")
        if from_date:
            queryset = queryset.filter(scheduled_at__gte=from_date)

        to_date = request.query_params.get("to_date")
        if to_date:
            queryset = queryset.filter(scheduled_at__lte=to_date)

        interviewer_id = request.query_params.get("interviewer_id")
        if interviewer_id:
            queryset = queryset.filter(participants__user_id=interviewer_id)

        serializer = RecruiterInterviewListSerializer(queryset, many=True)
        return Response({"interviews": serializer.data, "total_count": queryset.count()})


class RecruiterInterviewMetricsView(APIView):
    """GET /api/v1/recruiter/interviews/metrics/ - Dashboard top bar metrics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = _get_recruiter_company(request.user)
        now = timezone.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        interviews = Interview.objects.filter(job__company=company)

        scheduled_this_week = interviews.filter(scheduled_at__gte=start_of_week).count()
        scorecard_pending_qs = interviews.filter(
            interview_status=InterviewStatus.COMPLETED,
            feedback_submitted=False,
        )
        scorecard_pending = scorecard_pending_qs.count()
        overdue_threshold = now - timedelta(hours=24)
        overdue_scorecards = scorecard_pending_qs.filter(updated_at__lte=overdue_threshold).count()

        total_concluded = interviews.filter(
            interview_status__in=[InterviewStatus.COMPLETED, InterviewStatus.NO_SHOW, InterviewStatus.CANCELLED]
        ).count()
        completed_count = interviews.filter(interview_status=InterviewStatus.COMPLETED).count()
        completion_rate = round((completed_count / total_concluded * 100), 1) if total_concluded > 0 else 100.0

        return Response({
            "scheduled_this_week": scheduled_this_week,
            "scorecard_pending": scorecard_pending,
            "overdue_scorecards_count": overdue_scorecards,
            "completion_rate": completion_rate,
            "completed_count": completed_count,
            "total_concluded": total_concluded,
        })


class RecruiterScheduleInterviewView(APIView):
    """POST /api/v1/recruiter/interviews/schedule/ - Schedule interview round."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RecruiterScheduleInterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        interview, warnings = InterviewService.schedule_interview(
            recruiter_user=request.user,
            application_id=data["application_id"],
            interview_type=data.get("interview_type"),
            scheduled_at=data["scheduled_at"],
            duration_minutes=data.get("duration_minutes", 60),
            meeting_link=data.get("meeting_link"),
            location=data.get("location"),
            invitation_note=data.get("invitation_note"),
            job_stage_id=data.get("job_stage_id"),
            participants_data=data.get("participants", []),
        )

        resp_serializer = RecruiterInterviewListSerializer(interview)
        return Response(
            {
                "message": "Interview scheduled successfully.",
                "interview": resp_serializer.data,
                "warnings": warnings,
            },
            status=status.HTTP_201_CREATED,
        )


class RecruiterInterviewDetailView(APIView):
    """GET /api/v1/recruiter/interviews/<int:pk>/ - Detail view of an interview."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        company = _get_recruiter_company(request.user)
        try:
            interview = (
                Interview.objects.select_related("job", "application", "application__candidate__user", "scheduled_by")
                .prefetch_related("participants__user", "feedbacks__submitted_by", "feedbacks__criteria_ratings")
                .get(id=pk, job__company=company)
            )
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        serializer = RecruiterInterviewListSerializer(interview)
        return Response({"interview": serializer.data})


class RecruiterRescheduleInterviewView(APIView):
    """PATCH /api/v1/recruiter/interviews/<int:pk>/reschedule/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        serializer = RescheduleInterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        interview = InterviewService.reschedule_interview(
            user=request.user,
            interview_id=pk,
            new_scheduled_at=data["scheduled_at"],
            new_duration_minutes=data.get("duration_minutes"),
            new_meeting_link=data.get("meeting_link"),
            new_location=data.get("location"),
            reason=data.get("reason"),
        )
        return Response({
            "message": "Interview rescheduled successfully.",
            "interview": RecruiterInterviewListSerializer(interview).data,
        })


class RecruiterCancelInterviewView(APIView):
    """POST /api/v1/recruiter/interviews/<int:pk>/cancel/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = CancelInterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        interview = InterviewService.cancel_interview(
            user=request.user,
            interview_id=pk,
            reason=serializer.validated_data["reason"],
        )
        return Response({
            "message": "Interview cancelled.",
            "interview": RecruiterInterviewListSerializer(interview).data,
        })


class RecruiterInterviewOutcomeView(APIView):
    """POST /api/v1/recruiter/interviews/<int:pk>/outcome/ (complete or no_show)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = InterviewOutcomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        interview = InterviewService.mark_outcome(
            recruiter_user=request.user,
            interview_id=pk,
            outcome=data["outcome"],
            notes=data.get("notes"),
        )
        return Response({
            "message": f"Interview marked as {data['outcome']}.",
            "interview": RecruiterInterviewListSerializer(interview).data,
        })


class RecruiterScorecardView(APIView):
    """GET/POST /api/v1/recruiter/interviews/<int:pk>/scorecard/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        company = _get_recruiter_company(request.user)
        try:
            interview = Interview.objects.get(id=pk, job__company=company)
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        feedbacks = interview.feedbacks.select_related("submitted_by", "on_behalf_of_participant").prefetch_related("criteria_ratings")
        return Response({"feedbacks": InterviewFeedbackSerializer(feedbacks, many=True).data})

    def post(self, request, pk):
        serializer = SubmitScorecardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        feedback = InterviewService.submit_scorecard(
            recruiter_user=request.user,
            interview_id=pk,
            recommendation=data["recommendation"],
            overall_score=data.get("overall_score"),
            rating=data.get("rating"),
            technical_score=data.get("technical_score"),
            communication_score=data.get("communication_score"),
            comments=data.get("comments"),
            growth_areas=data.get("growth_areas"),
            internal_notes=data.get("internal_notes"),
            on_behalf_of_participant_id=data.get("on_behalf_of_participant_id"),
            criteria_ratings=data.get("criteria_ratings"),
        )
        return Response(
            {
                "message": "Scorecard submitted successfully.",
                "feedback": InterviewFeedbackSerializer(feedback).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, pk):
        serializer = SubmitScorecardSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        feedback = InterviewService.update_scorecard(
            recruiter_user=request.user,
            interview_id=pk,
            recommendation=data.get("recommendation"),
            overall_score=data.get("overall_score"),
            rating=data.get("rating"),
            technical_score=data.get("technical_score"),
            communication_score=data.get("communication_score"),
            comments=data.get("comments"),
            growth_areas=data.get("growth_areas"),
            internal_notes=data.get("internal_notes"),
            on_behalf_of_participant_id=data.get("on_behalf_of_participant_id"),
            criteria_ratings=data.get("criteria_ratings"),
        )
        return Response(
            {
                "message": "Scorecard updated successfully.",
                "feedback": InterviewFeedbackSerializer(feedback).data,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, pk):
        return self.patch(request, pk)


class RecruiterNudgePanelView(APIView):
    """POST /api/v1/recruiter/interviews/participants/<int:pid>/nudge/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pid):
        _get_recruiter_company(request.user)
        participant = InterviewService.nudge_panelist(request.user, pid)
        return Response({
            "message": f"Nudge sent to {participant.display_name}.",
            "nudge_count": participant.nudge_count,
            "last_nudged_at": participant.last_nudged_at,
        })


# ==============================================================================
# Candidate Interview Views
# ==============================================================================


class CandidateInterviewListView(APIView):
    """GET /api/v1/candidate/interviews/ - List all interviews for candidate."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_candidate_profile(request.user)
        now = timezone.now()

        queryset = (
            Interview.objects.filter(application__candidate=profile)
            .select_related("job", "job__company", "application")
            .prefetch_related("participants__user")
            .order_by("-scheduled_at")
        )

        status_param = request.query_params.get("status")
        if status_param == "upcoming":
            queryset = queryset.filter(
                interview_status=InterviewStatus.SCHEDULED,
                scheduled_at__gte=now - timedelta(hours=2),
            ).order_by("scheduled_at")
        elif status_param == "past":
            queryset = queryset.filter(
                Q(interview_status=InterviewStatus.COMPLETED)
                | Q(interview_status=InterviewStatus.NO_SHOW)
                | (Q(interview_status=InterviewStatus.SCHEDULED) & Q(scheduled_at__lt=now - timedelta(hours=2)))
            )
        elif status_param == "cancelled":
            queryset = queryset.filter(interview_status=InterviewStatus.CANCELLED)

        interview_type = request.query_params.get("type")
        if interview_type and interview_type != "all":
            queryset = queryset.filter(interview_type=interview_type)

        serializer = CandidateInterviewSerializer(queryset, many=True, context={"request": request})

        # Calculate counts for tabs
        upcoming_count = Interview.objects.filter(
            application__candidate=profile,
            interview_status=InterviewStatus.SCHEDULED,
            scheduled_at__gte=now - timedelta(hours=2),
        ).count()
        past_count = Interview.objects.filter(
            application__candidate=profile,
            interview_status__in=[InterviewStatus.COMPLETED, InterviewStatus.NO_SHOW],
        ).count()
        cancelled_count = Interview.objects.filter(
            application__candidate=profile,
            interview_status=InterviewStatus.CANCELLED,
        ).count()

        return Response({
            "interviews": serializer.data,
            "counts": {
                "upcoming": upcoming_count,
                "past": past_count,
                "cancelled": cancelled_count,
            },
        })


class CandidateInterviewDetailView(APIView):
    """GET /api/v1/candidate/interviews/<int:pk>/ - Candidate interview brief."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        profile = _get_candidate_profile(request.user)
        try:
            interview = (
                Interview.objects.select_related("job", "job__company", "application")
                .prefetch_related("participants__user")
                .get(id=pk, application__candidate=profile)
            )
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        serializer = CandidateInterviewSerializer(interview, context={"request": request})
        return Response({"interview": serializer.data})


class CandidateInterviewRespondView(APIView):
    """POST /api/v1/candidate/interviews/<int:pk>/respond/ - Candidate RSVP (accept or decline)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        response_status_val = request.data.get("response_status", "accepted")
        notes = request.data.get("notes")

        participant = InterviewService.candidate_respond(
            candidate_user=request.user,
            interview_id=pk,
            response_status=response_status_val,
            notes=notes,
        )
        return Response({
            "message": f"RSVP recorded as {response_status_val}.",
            "response_status": participant.response_status,
        })


class CandidateRequestRescheduleView(APIView):
    """POST /api/v1/candidate/interviews/<int:pk>/request-reschedule/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        profile = _get_candidate_profile(request.user)
        reason = request.data.get("reason", "").strip()
        preferred_slots = request.data.get("preferred_slots", "").strip()

        if not reason:
            raise ApiError(code="reason_required", message="Please explain why you need to reschedule.", status_code=400)

        try:
            interview = Interview.objects.select_related("scheduled_by", "job").get(
                id=pk, application__candidate=profile
            )
        except Interview.DoesNotExist:
            raise ApiError(code="interview_not_found", message="Interview not found.", status_code=404)

        # Notify recruiter
        notification_service.notify(
            user=interview.scheduled_by,
            notification_type=NotificationType.INTERVIEW_RESCHEDULED,
            title=f"Reschedule Requested: {request.user.full_name}",
            message=f"{request.user.full_name} has requested to reschedule the {interview.get_interview_type_display()} for '{interview.job.job_title}'. Reason: {reason}. Preferred: {preferred_slots or 'Any'}",
            redirect_url=f"/recruiter/interviews",
            source_type="interview",
            source_id=interview.id,
        )

        return Response({"message": "Reschedule request sent to the recruiting team."})
