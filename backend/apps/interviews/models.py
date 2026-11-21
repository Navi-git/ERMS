from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.applications.models import Application
from apps.jobs.models import Job, JobStage


class InterviewStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    NO_SHOW = "no_show", "No-Show"


class InterviewType(models.TextChoices):
    PHONE = "phone", "Phone Screen"
    TECHNICAL = "technical", "Technical Interview"
    BEHAVIORAL = "behavioral", "Behavioral Interview"
    PORTFOLIO = "portfolio", "Portfolio Review"
    FINAL = "final", "Final Round"
    ON_SITE = "on_site", "On-Site Visit"
    HR = "hr", "HR Screening"


class ParticipantType(models.TextChoices):
    INTERVIEWER = "interviewer", "Interviewer"
    CANDIDATE = "candidate", "Candidate"


class ParticipantRole(models.TextChoices):
    LEAD = "lead", "Lead Interviewer"
    PANELIST = "panelist", "Panelist"
    OBSERVER = "observer", "Observer"
    CANDIDATE = "candidate", "Candidate"


class ResponseStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"


class Recommendation(models.TextChoices):
    STRONG_YES = "strong_yes", "Strong Yes"
    YES = "yes", "Yes"
    NEUTRAL = "neutral", "Neutral"
    NO = "no", "No"
    STRONG_NO = "strong_no", "Strong No"


class Interview(models.Model):
    """Table 24: interviews - Scheduled evaluations for applicants."""

    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name="interviews"
    )
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="interviews")
    scheduled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="scheduled_interviews",
    )
    job_stage = models.ForeignKey(
        JobStage,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="interviews",
    )

    # Details
    interview_type = models.CharField(
        max_length=50, choices=InterviewType.choices, default=InterviewType.TECHNICAL
    )
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    meeting_link = models.CharField(max_length=500, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    interview_status = models.CharField(
        max_length=20,
        choices=InterviewStatus.choices,
        default=InterviewStatus.SCHEDULED,
    )
    invitation_note = models.TextField(null=True, blank=True)

    # Cancellation Tracking
    cancellation_reason = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cancelled_interviews",
    )

    feedback_submitted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interviews"
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["job", "scheduled_at"]),
            models.Index(fields=["application", "interview_status"]),
        ]

    def __str__(self):
        return f"{self.interview_type} - {self.application.candidate.user.full_name} ({self.interview_status})"

    @property
    def display_status(self):
        if self.interview_status == InterviewStatus.COMPLETED and not self.feedback_submitted:
            return "feedback_pending"
        return self.interview_status

    @property
    def end_time(self):
        return self.scheduled_at + timezone.timedelta(minutes=self.duration_minutes)


class InterviewParticipant(models.Model):
    """Table 25: interview_participants - Candidates, team members and external panelists."""

    interview = models.ForeignKey(
        Interview, on_delete=models.CASCADE, related_name="participants"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="interview_participations",
    )
    participant_type = models.CharField(
        max_length=20, choices=ParticipantType.choices, default=ParticipantType.INTERVIEWER
    )

    # External Panelists
    external_name = models.CharField(max_length=150, null=True, blank=True)
    external_email = models.EmailField(max_length=255, null=True, blank=True)
    participant_role = models.CharField(
        max_length=30, choices=ParticipantRole.choices, default=ParticipantRole.PANELIST
    )

    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    response_status = models.CharField(
        max_length=30, choices=ResponseStatus.choices, default=ResponseStatus.INVITED
    )
    joined_at = models.DateTimeField(null=True, blank=True)

    last_nudged_at = models.DateTimeField(null=True, blank=True)
    nudge_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_participants"
        indexes = [
            models.Index(fields=["interview", "participant_type"]),
        ]

    def __str__(self):
        name = self.user.full_name if self.user else self.external_name
        return f"{name} ({self.participant_role}) for Interview #{self.interview_id}"

    @property
    def display_name(self):
        if self.user:
            return self.user.full_name
        return self.external_name or "Guest Panelist"

    @property
    def email(self):
        if self.user:
            return self.user.email
        return self.external_email


class InterviewFeedback(models.Model):
    """Table 26: interview_feedback - Candidate evaluations and ratings submitted post-interview."""

    interview = models.ForeignKey(
        Interview, on_delete=models.CASCADE, related_name="feedbacks"
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_feedbacks",
    )
    on_behalf_of_participant = models.ForeignKey(
        InterviewParticipant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="feedbacks_on_behalf",
    )

    rating = models.IntegerField(null=True, blank=True)  # Overall stars 1-5
    technical_score = models.IntegerField(null=True, blank=True)
    communication_score = models.IntegerField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    recommendation = models.CharField(
        max_length=30, choices=Recommendation.choices, default=Recommendation.YES
    )

    comments = models.TextField(null=True, blank=True)  # Strengths & key highlights
    growth_areas = models.TextField(null=True, blank=True)  # Areas for growth
    internal_notes = models.TextField(null=True, blank=True)  # Confidential to hiring team

    submitted_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "interview_feedback"
        ordering = ["-submitted_at"]

    def __str__(self):
        author = self.submitted_by.full_name
        if self.on_behalf_of_participant:
            author = f"{author} (on behalf of {self.on_behalf_of_participant.display_name})"
        return f"Scorecard by {author} for Interview #{self.interview_id} [{self.recommendation}]"


class InterviewFeedbackCriteria(models.Model):
    """Table 27: interview_feedback_criteria - Detailed rating per competency on scorecard."""

    feedback = models.ForeignKey(
        InterviewFeedback, on_delete=models.CASCADE, related_name="criteria_ratings"
    )
    criterion_key = models.CharField(max_length=60)
    criterion_label = models.CharField(max_length=150)
    criterion_description = models.TextField(null=True, blank=True)
    benchmark_level = models.CharField(max_length=50, null=True, blank=True)
    score = models.PositiveIntegerField()  # 1 to 5
    max_score = models.PositiveIntegerField(default=5)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_feedback_criteria"
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["feedback", "criterion_key"],
                name="unique_criterion_per_feedback",
            )
        ]

    def __str__(self):
        return f"{self.criterion_label}: {self.score}/{self.max_score} (Feedback #{self.feedback_id})"
