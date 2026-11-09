"""ERD Tables for Jobs Module:
- jobs (Table 16)
- job_benefits (Table 17)
- job_skills (Table 18)
- job_stages (Table 19)
- saved_jobs (Table 31)
- reports (Table 49)
- view_events (Table 52)
- entity_notes (Table 53)
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class JobStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    CLOSED = "closed", "Closed"
    ON_HOLD = "on_hold", "On Hold"


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full-time"
    PART_TIME = "part_time", "Part-time"
    CONTRACT = "contract", "Contract"
    INTERNSHIP = "internship", "Internship"


class StageType(models.TextChoices):
    APPLIED = "applied", "Applied"
    SCREENING = "screening", "Screening"
    INTERVIEW = "interview", "Interview"
    OFFER = "offer", "Offer"
    HIRED = "hired", "Hired"
    CUSTOM = "custom", "Custom"


class ReportStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_REVIEW = "in_review", "In Review"
    RESOLVED = "resolved", "Resolved"
    DISMISSED = "dismissed", "Dismissed"


class Job(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="jobs",
        db_column="company_id",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_jobs",
        db_column="created_by",
    )

    # Basic Info
    job_title = models.CharField(max_length=255)
    job_category = models.ForeignKey(
        "master_data.MasterDataItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="category_jobs",
        db_column="job_category_id",
    )
    department = models.ForeignKey(
        "master_data.MasterDataItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="department_jobs",
        db_column="department_id",
    )
    experience_level = models.ForeignKey(
        "master_data.MasterDataItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="experience_level_jobs",
        db_column="experience_level_id",
    )
    employment_type = models.CharField(
        max_length=50,
        choices=EmploymentType.choices,
        null=True,
        blank=True,
    )
    location = models.CharField(max_length=255, null=True, blank=True)
    work_mode = models.ForeignKey(
        "master_data.MasterDataItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="work_mode_jobs",
        db_column="work_mode_id",
    )

    # Details (Markdown supported)
    job_description = models.TextField(blank=True, default="")
    requirements = models.TextField(null=True, blank=True)
    responsibilities = models.TextField(null=True, blank=True)

    # Compensation
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default="USD")

    openings = models.IntegerField(default=1)
    accepts_cover_letter = models.BooleanField(default=False)
    promote_on_job_boards = models.BooleanField(default=False)

    # Status
    job_status = models.CharField(
        max_length=50,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT,
    )
    application_deadline = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    filled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    on_hold_reason = models.TextField(null=True, blank=True)

    # Draft Management
    is_draft = models.BooleanField(default=True)
    draft_saved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "jobs"
        indexes = [
            models.Index(fields=["company", "job_status"], name="jobs_company_status_idx"),
            models.Index(fields=["created_by", "published_at"], name="jobs_creator_pub_idx"),
            models.Index(fields=["job_status", "application_deadline"], name="jobs_status_deadline_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job_title} ({self.company.name})"

    @property
    def is_expired(self):
        if self.application_deadline:
            return timezone.now() > self.application_deadline
        return False


class JobBenefit(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="benefits",
        db_column="job_id",
    )
    benefit_name = models.CharField(max_length=255)
    custom_description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_benefits"
        ordering = ["id"]

    def __str__(self):
        return f"{self.benefit_name} ({self.job.job_title})"


class JobSkill(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="skills",
        db_column="job_id",
    )
    skill = models.ForeignKey(
        "master_data.MasterDataItem",
        on_delete=models.CASCADE,
        related_name="job_skills",
        db_column="skill_id",
    )
    is_required = models.BooleanField(default=True)
    proficiency_level = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "job_skills"
        unique_together = [("job", "skill")]

    def __str__(self):
        return f"{self.skill.value} ({self.job.job_title})"


class JobStage(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="stages",
        db_column="job_id",
    )
    name = models.CharField(max_length=100)
    stage_order = models.IntegerField()
    stage_type = models.CharField(
        max_length=50,
        choices=StageType.choices,
        default=StageType.CUSTOM,
    )
    description = models.TextField(null=True, blank=True)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_stages"
        indexes = [
            models.Index(fields=["job", "stage_order"], name="job_stages_job_order_idx"),
        ]
        ordering = ["stage_order"]

    def __str__(self):
        return f"Stage {self.stage_order}: {self.name} ({self.job.job_title})"


class SavedJob(models.Model):
    candidate = models.ForeignKey(
        "candidates.CandidateProfile",
        on_delete=models.CASCADE,
        related_name="saved_jobs",
        db_column="candidate_id",
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="saved_by_candidates",
        db_column="job_id",
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_jobs"
        unique_together = [("candidate", "job")]
        ordering = ["-saved_at"]

    def __str__(self):
        return f"{self.candidate.user.email} saved {self.job.job_title}"


class Report(models.Model):
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports_filed",
        db_column="reporter_id",
    )
    target_type = models.CharField(max_length=30)  # e.g., 'job', 'company', 'candidate'
    target_id = models.BigIntegerField()
    reason = models.CharField(max_length=100)
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
        db_column="resolved_by",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reports"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report #{self.id}: {self.target_type} ({self.reason})"


class ViewEvent(models.Model):
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="view_events",
        db_column="viewer_id",
    )
    entity_type = models.CharField(max_length=50)  # e.g., 'job', 'company', 'profile'
    entity_id = models.BigIntegerField()
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "view_events"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="view_events_entity_idx"),
        ]
        ordering = ["-viewed_at"]

    def __str__(self):
        return f"View {self.entity_type}:{self.entity_id} at {self.viewed_at}"


class EntityNote(models.Model):
    entity_type = models.CharField(max_length=50)  # e.g., 'job', 'application', 'interview'
    entity_id = models.BigIntegerField()
    note_text = models.TextField()
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entity_notes_added",
        db_column="added_by",
    )
    is_internal = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "entity_notes"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="entity_notes_entity_idx"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note on {self.entity_type}:{self.entity_id} by {self.added_by}"

