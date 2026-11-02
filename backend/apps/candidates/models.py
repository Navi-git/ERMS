"""ERD Models for Candidate Profile, Resumes, Education, Experience, and Skills."""
from django.conf import settings
from django.db import models


class SeekingStatus(models.TextChoices):
    ACTIVELY_SEEKING = "actively_seeking", "Actively Seeking"
    OPEN_TO_OFFERS = "open_to_offers", "Open to Offers"
    NOT_SEEKING = "not_seeking", "Not Seeking"


class ProficiencyLevel(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"
    EXPERT = "expert", "Expert"


class CandidateProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
        db_column="user_id",
    )
    headline = models.CharField(max_length=255, null=True, blank=True)
    summary = models.TextField(null=True, blank=True)
    current_location = models.CharField(max_length=255, null=True, blank=True)
    seeking_status = models.CharField(
        max_length=50,
        choices=SeekingStatus.choices,
        default=SeekingStatus.ACTIVELY_SEEKING,
    )
    expected_salary_min = models.IntegerField(null=True, blank=True)
    expected_salary_max = models.IntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    work_authorization_status = models.CharField(max_length=50, null=True, blank=True)
    security_clearance = models.CharField(max_length=100, null=True, blank=True)
    willing_to_relocate = models.BooleanField(default=False)
    linkedin_url = models.TextField(null=True, blank=True)
    github_url = models.TextField(null=True, blank=True)
    portfolio_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "candidate_profiles"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"CandidateProfile(user_id={self.user_id}, {self.headline or 'No headline'})"


class Resume(models.Model):
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="resumes",
        db_column="candidate_id",
    )
    title = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500)
    file_path = models.CharField(max_length=500, blank=True, default="")
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resumes"
        ordering = ["-is_default", "-uploaded_at"]

    def __str__(self):
        return f"Resume({self.title}, candidate_id={self.candidate_id}, default={self.is_default})"


class ResumeAnalysis(models.Model):
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name="analysis",
        db_column="resume_id",
    )
    ats_score = models.IntegerField(null=True, blank=True)
    extracted_text = models.TextField(null=True, blank=True)
    strengths = models.JSONField(default=list, blank=True)
    weaknesses = models.JSONField(default=list, blank=True)
    missing_keywords = models.JSONField(default=list, blank=True)
    matched_keywords = models.JSONField(default=list, blank=True)
    analysis_result = models.JSONField(default=dict, blank=True)
    model_version = models.CharField(max_length=100, default="ats-engine-v1")
    analyzed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resume_analyses"
        ordering = ["-analyzed_at"]

    def __str__(self):
        return f"ResumeAnalysis(resume_id={self.resume_id}, score={self.ats_score})"


class Education(models.Model):
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="educations",
        db_column="candidate_id",
    )
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=150, null=True, blank=True)
    field_of_study = models.CharField(max_length=150, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_currently_studying = models.BooleanField(default=False)
    gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "education"
        ordering = ["-start_date", "-created_at"]

    def __str__(self):
        return f"Education({self.degree} at {self.institution})"


class Experience(models.Model):
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="experiences",
        db_column="candidate_id",
    )
    job_title = models.CharField(max_length=150)
    company_name = models.CharField(max_length=255)
    employment_type = models.CharField(max_length=50, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "experience"
        ordering = ["-start_date", "-created_at"]

    def __str__(self):
        return f"Experience({self.job_title} at {self.company_name})"


class CandidateSkill(models.Model):
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="skills",
        db_column="candidate_id",
    )
    skill = models.ForeignKey(
        "master_data.MasterDataItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidate_skills",
        db_column="skill_id",
    )
    custom_skill_name = models.CharField(max_length=150, null=True, blank=True)
    proficiency_level = models.CharField(
        max_length=30,
        choices=ProficiencyLevel.choices,
        default=ProficiencyLevel.INTERMEDIATE,
    )
    years_of_experience = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidate_skills"
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "skill"],
                condition=models.Q(skill__isnull=False),
                name="unique_candidate_master_skill",
            ),
            models.UniqueConstraint(
                fields=["candidate", "custom_skill_name"],
                condition=models.Q(custom_skill_name__isnull=False),
                name="unique_candidate_custom_skill",
            ),
        ]
        ordering = ["-years_of_experience", "created_at"]

    def __str__(self):
        skill_name = self.skill.value if self.skill else self.custom_skill_name
        return f"CandidateSkill({skill_name}, {self.proficiency_level})"

