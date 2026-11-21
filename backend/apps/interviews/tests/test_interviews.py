from datetime import timedelta
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.companies.models import Company, CompanyVerificationStatus
from apps.candidates.models import CandidateProfile, Resume
from apps.jobs.models import Job, JobStatus, JobStage, StageType
from apps.applications.models import Application, ApplicationStatus
from apps.interviews.models import (
    Interview,
    InterviewParticipant,
    InterviewFeedback,
    InterviewStatus,
    InterviewType,
    ParticipantRole,
    ResponseStatus,
    Recommendation,
)
from apps.interviews.services.interview_service import InterviewService


@pytest.fixture
def recruiter_user(db):
    return User.objects.create_user(
        email="recruiter.interview@example.com",
        password="Password@123",
        role="recruiter",
        full_name="Sarah Jenkins",
        is_email_verified=True,
    )


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        email="candidate.interview@example.com",
        password="Password@123",
        role="candidate",
        full_name="Eleanor Pena",
        is_email_verified=True,
    )


@pytest.fixture
def company(db, recruiter_user):
    return Company.objects.create(
        admin_user=recruiter_user,
        name="TechGlobal Labs",
        verification_status=CompanyVerificationStatus.APPROVED,
    )


@pytest.fixture
def candidate_profile(db, candidate_user):
    return CandidateProfile.objects.create(
        user=candidate_user,
        headline="Senior Product Designer",
    )


@pytest.fixture
def resume(db, candidate_profile):
    return Resume.objects.create(
        candidate=candidate_profile,
        title="Eleanor Resume",
        file_name="eleanor_resume.pdf",
        file_url="/media/resumes/eleanor_resume.pdf",
        file_type="application/pdf",
        is_default=True,
    )


@pytest.fixture
def job(db, company, recruiter_user):
    return Job.objects.create(
        company=company,
        created_by=recruiter_user,
        job_title="Senior Product Designer",
        job_status=JobStatus.PUBLISHED,
        published_at=timezone.now(),
        location="San Francisco, CA (Hybrid)",
    )


@pytest.fixture
def job_stage(db, job):
    return JobStage.objects.create(
        job=job,
        name="Technical Round",
        stage_type=StageType.INTERVIEW,
        stage_order=2,
    )


@pytest.fixture
def application(db, candidate_profile, job, resume):
    return Application.objects.create(
        candidate=candidate_profile,
        job=job,
        resume=resume,
        application_status=ApplicationStatus.SHORTLISTED,
    )


@pytest.mark.django_db
class TestInterviewModule:

    def test_schedule_interview_and_participants(self, recruiter_user, application, job_stage):
        scheduled_time = timezone.now() + timedelta(days=2)
        participants_data = [
            {
                "external_name": "Mark Chen",
                "external_email": "mark.chen@external.advisor.io",
                "participant_role": "panelist",
            }
        ]

        interview, warnings = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.TECHNICAL,
            scheduled_at=scheduled_time,
            duration_minutes=45,
            meeting_link="https://meet.google.com/xyz-abcd-efg",
            location="Virtual (Google Meet)",
            invitation_note="Please prepare your design portfolio and design systems breakdown.",
            job_stage_id=job_stage.id,
            participants_data=participants_data,
        )

        assert interview.id is not None
        assert interview.interview_status == InterviewStatus.SCHEDULED
        assert interview.duration_minutes == 45
        assert interview.meeting_link == "https://meet.google.com/xyz-abcd-efg"

        # Check application status updated to interview_scheduled
        application.refresh_from_db()
        assert application.application_status == ApplicationStatus.INTERVIEW_SCHEDULED

        # Check participants
        parts = interview.participants.all()
        assert parts.count() == 3  # Candidate + Recruiter Host + External Panelist

        cand_part = parts.filter(user=application.candidate.user).first()
        assert cand_part is not None
        assert cand_part.response_status == ResponseStatus.INVITED

        recruiter_part = parts.filter(user=recruiter_user).first()
        assert recruiter_part is not None
        assert recruiter_part.participant_role == ParticipantRole.LEAD

        ext_part = parts.filter(external_email="mark.chen@external.advisor.io").first()
        assert ext_part is not None
        assert ext_part.external_name == "Mark Chen"
        assert ext_part.display_name == "Mark Chen"

    def test_reschedule_interview(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.TECHNICAL,
            scheduled_at=now + timedelta(days=1),
            duration_minutes=30,
        )

        new_time = now + timedelta(days=3)
        rescheduled = InterviewService.reschedule_interview(
            user=recruiter_user,
            interview_id=interview.id,
            new_scheduled_at=new_time,
            new_duration_minutes=60,
            new_meeting_link="https://zoom.us/j/123456789",
            reason="Interviewer conflict",
        )

        assert rescheduled.scheduled_at == new_time
        assert rescheduled.duration_minutes == 60
        assert rescheduled.meeting_link == "https://zoom.us/j/123456789"

    def test_cancel_interview(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.PHONE,
            scheduled_at=now + timedelta(days=1),
            duration_minutes=30,
        )

        cancelled = InterviewService.cancel_interview(
            user=recruiter_user,
            interview_id=interview.id,
            reason="Position filled internally",
        )

        assert cancelled.interview_status == InterviewStatus.CANCELLED
        assert cancelled.cancellation_reason == "Position filled internally"
        assert cancelled.cancelled_by == recruiter_user

    def test_mark_outcome_and_derived_status(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.PORTFOLIO,
            scheduled_at=now - timedelta(hours=2),
            duration_minutes=45,
        )

        # Mark completed
        completed_interview = InterviewService.mark_outcome(
            recruiter_user=recruiter_user,
            interview_id=interview.id,
            outcome="completed",
        )
        assert completed_interview.interview_status == InterviewStatus.COMPLETED
        assert completed_interview.feedback_submitted is False
        assert completed_interview.display_status == "feedback_pending"

    def test_submit_scorecard_direct_and_proxy_mode(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.TECHNICAL,
            scheduled_at=now - timedelta(hours=1),
            duration_minutes=60,
            participants_data=[
                {
                    "external_name": "Aris Thorne",
                    "external_email": "aris@advisor.org",
                    "participant_role": "panelist",
                }
            ],
        )

        ext_participant = interview.participants.filter(external_email="aris@advisor.org").first()

        # Submit scorecard in Proxy Mode (recruiter on behalf of Aris Thorne)
        criteria = [
            {"criterion_key": "tech_arch", "criterion_label": "System Design & Architecture", "score": 5},
            {"criterion_key": "prod_sense", "criterion_label": "Product Sense & UX", "score": 4},
            {"criterion_key": "comm", "criterion_label": "Cross-functional Communication", "score": 5},
            {"criterion_key": "prob_solv", "criterion_label": "Problem Solving", "score": 4},
        ]

        feedback = InterviewService.submit_scorecard(
            recruiter_user=recruiter_user,
            interview_id=interview.id,
            recommendation=Recommendation.STRONG_YES,
            rating=5,
            technical_score=5,
            communication_score=5,
            comments="Exceptional intuition regarding multi-tenant design systems.",
            growth_areas="Deepen exposure to edge CDN caching.",
            internal_notes="Ready for Executive Offer Review.",
            on_behalf_of_participant_id=ext_participant.id,
            criteria_ratings=criteria,
        )

        assert feedback.id is not None
        assert feedback.on_behalf_of_participant == ext_participant
        assert feedback.recommendation == Recommendation.STRONG_YES
        assert feedback.overall_score == 4.5
        assert feedback.criteria_ratings.count() == 4

        interview.refresh_from_db()
        assert interview.feedback_submitted is True
        assert interview.interview_status == InterviewStatus.COMPLETED

    def test_nudge_panelist(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.TECHNICAL,
            scheduled_at=now - timedelta(hours=2),
            participants_data=[
                {"external_name": "Dr. Aris", "external_email": "aris@expert.com", "participant_role": "panelist"}
            ],
        )

        panelist = interview.participants.filter(external_email="aris@expert.com").first()
        nudged = InterviewService.nudge_panelist(recruiter_user, panelist.id)

        assert nudged.nudge_count == 1
        assert nudged.last_nudged_at is not None

    def test_candidate_api_flow(self, candidate_user, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.TECHNICAL,
            scheduled_at=now + timedelta(days=2),
            duration_minutes=45,
            meeting_link="https://meet.google.com/test",
        )

        client = APIClient()
        client.force_authenticate(user=candidate_user)

        # 1. Candidate lists upcoming interviews
        res = client.get("/api/v1/candidate/interviews/?status=upcoming")
        assert res.status_code == 200
        assert len(res.data["interviews"]) >= 1
        assert res.data["counts"]["upcoming"] >= 1

        # 2. Candidate RSVP accept
        res_rsvp = client.post(
            f"/api/v1/candidate/interviews/{interview.id}/respond/",
            {"response_status": "accepted"},
            format="json",
        )
        assert res_rsvp.status_code == 200
        assert res_rsvp.data["response_status"] == "accepted"

        # 3. Candidate request reschedule
        res_req = client.post(
            f"/api/v1/candidate/interviews/{interview.id}/request-reschedule/",
            {"reason": "Doctor appointment conflict", "preferred_slots": "Next Friday afternoon"},
            format="json",
        )
        assert res_req.status_code == 200
        assert "Reschedule request sent" in res_req.data["message"]

    def test_recruiter_api_metrics_and_list(self, recruiter_user, application):
        client = APIClient()
        client.force_authenticate(user=recruiter_user)

        # Metrics check
        res_metrics = client.get("/api/v1/recruiter/interviews/metrics/")
        assert res_metrics.status_code == 200
        assert "scheduled_this_week" in res_metrics.data
        assert "scorecard_pending" in res_metrics.data
        assert "completion_rate" in res_metrics.data

        # List check
        res_list = client.get("/api/v1/recruiter/interviews/")
        assert res_list.status_code == 200
        assert "interviews" in res_list.data

    def test_update_scorecard_and_application_filter(self, recruiter_user, application):
        now = timezone.now()
        interview, _ = InterviewService.schedule_interview(
            recruiter_user=recruiter_user,
            application_id=application.id,
            interview_type=InterviewType.BEHAVIORAL,
            scheduled_at=now - timedelta(hours=1),
            duration_minutes=45,
        )

        client = APIClient()
        client.force_authenticate(user=recruiter_user)

        # 1. Filter interviews by application_id
        res_filter = client.get(f"/api/v1/recruiter/interviews/?application_id={application.id}")
        assert res_filter.status_code == 200
        assert any(i["id"] == interview.id for i in res_filter.data["interviews"])

        # 2. Submit initial scorecard
        criteria = [
            {"criterion_key": "comm", "criterion_label": "Communication", "score": 3},
            {"criterion_key": "lead", "criterion_label": "Leadership", "score": 3},
        ]
        res_submit = client.post(
            f"/api/v1/recruiter/interviews/{interview.id}/scorecard/",
            {
                "recommendation": Recommendation.NEUTRAL,
                "comments": "Average communication.",
                "criteria_ratings": criteria,
            },
            format="json",
        )
        assert res_submit.status_code == 201
        assert res_submit.data["feedback"]["recommendation"] == Recommendation.NEUTRAL

        # 3. Update existing scorecard via PATCH
        res_patch = client.patch(
            f"/api/v1/recruiter/interviews/{interview.id}/scorecard/",
            {
                "recommendation": Recommendation.YES,
                "comments": "Revised: Excellent communicator after team debrief.",
                "criteria_ratings": [
                    {"criterion_key": "comm", "criterion_label": "Communication", "score": 5},
                    {"criterion_key": "lead", "criterion_label": "Leadership", "score": 4},
                ],
            },
            format="json",
        )
        assert res_patch.status_code == 200
        assert res_patch.data["feedback"]["recommendation"] == Recommendation.YES
        assert res_patch.data["feedback"]["overall_score"] == 4.5
        assert "Revised" in res_patch.data["feedback"]["comments"]
