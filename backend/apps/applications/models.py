"""ERD Tables for Applications & Screening Module:
- applications (Table 20)
- application_stage_progress (Table 21)
- application_materials (Table 22)
- application_notes (Table 23)
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class ApplicationStatus(models.TextChoices):
    APPLIED = "applied", "Applied"
    REVIEWING = "reviewing", "Reviewing"
    SHORTLISTED = "shortlisted", "Shortlisted"
    INTERVIEW_SCHEDULED = "interview_scheduled", "Interview Scheduled"
    OFFER_SENT = "offer_sent", "Offer Sent"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"


class Application(models.Model):
    """Table 20: applications - Candidate job application record."""

    candidate = models.ForeignKey(
        "candidates.CandidateProfile",
        on_delete=models.CASCADE,
        related_name="applications",
        db_column="candidate_id",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="applications",
        db_column="job_id",
    )
    resume = models.ForeignKey(
        "candidates.Resume",
        on_delete=models.PROTECT,
        related_name="applications",
        db_column="resume_id",
    )

    # Candidate links & pitch
    linkedin_url = models.CharField(max_length=500, null=True, blank=True)
    portfolio_url = models.CharField(max_length=500, null=True, blank=True)
    message_to_hiring_manager = models.CharField(max_length=255, null=True, blank=True)

    # Application Status & Details
    application_status = models.CharField(
        max_length=30,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
    )
    applied_at = models.DateTimeField(default=timezone.now)
    cover_letter = models.TextField(null=True, blank=True)

    # Attribution & Channel
    source = models.CharField(max_length=50, default="direct")
    referred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        db_column="referred_by",
    )

    # Internal hiring notes (deprecated in favor of application_notes, preserved for ERD parity)
    hiring_notes = models.TextField(null=True, blank=True)

    # Timestamps & Lifecycle tracking
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        db_column="reviewed_by",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    offer_extended_at = models.DateTimeField(null=True, blank=True)
    hired_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "applications"
        constraints = [
            models.UniqueConstraint(
                fields=["job", "candidate"],
                name="unique_job_candidate_application",
            )
        ]
        indexes = [
            models.Index(fields=["job", "candidate"], name="app_job_candidate_idx"),
            models.Index(fields=["application_status", "applied_at"], name="app_status_applied_idx"),
            models.Index(fields=["source"], name="app_source_idx"),
        ]

    def __str__(self):
        return f"Application #{self.id} - Candidate {self.candidate_id} for Job {self.job_id} ({self.application_status})"


class ApplicationStageProgress(models.Model):
    """Table 21: application_stage_progress - Tracks a candidate's movement through recruitment stages."""

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="stage_progresses",
        db_column="application_id",
    )
    job_stage = models.ForeignKey(
        "jobs.JobStage",
        on_delete=models.CASCADE,
        related_name="application_progresses",
        db_column="job_stage_id",
    )
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        db_column="changed_by",
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "application_stage_progress"
        ordering = ["started_at", "id"]

    def __str__(self):
        return f"App #{self.application_id} in Stage {self.job_stage_id} ({self.started_at})"


class ApplicationMaterial(models.Model):
    """Table 22: application_materials - Supplemental files and links submitted with an application."""

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="materials",
        db_column="application_id",
    )
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50)  # resume, cover_letter, portfolio, certificate, link, other
    uploaded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "application_materials"
        ordering = ["uploaded_at", "id"]

    def __str__(self):
        return f"{self.file_name} ({self.file_type}) for App #{self.application_id}"


class ApplicationNote(models.Model):
    """Table 23: application_notes - Internal team notes and collaboration for recruiters."""

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="notes",
        db_column="application_id",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="application_notes",
        db_column="author_id",
    )
    note = models.TextField()
    is_internal = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "application_notes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note by User #{self.author_id} on App #{self.application_id}"

