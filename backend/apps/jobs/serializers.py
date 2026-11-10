"""Serializers for Jobs module (Public, Recruiter, Candidate, Admin)."""
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.companies.models import Company
from apps.jobs.models import (
    EmploymentType,
    EntityNote,
    Job,
    JobBenefit,
    JobSkill,
    JobStage,
    JobStatus,
    Report,
    SavedJob,
    StageType,
)
from apps.master_data.models import MasterDataItem


# ==============================================================================
# Helper / Nested Serializers
# ==============================================================================


class MasterDataSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterDataItem
        fields = ["id", "category", "key", "value"]


class JobStageSerializer(serializers.ModelSerializer):
    stage_order = serializers.IntegerField(required=False)

    class Meta:
        model = JobStage
        fields = [
            "id",
            "name",
            "stage_order",
            "stage_type",
            "description",
            "is_required",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class JobSkillSerializer(serializers.ModelSerializer):
    skill_id = serializers.IntegerField(source="skill.id")
    skill_name = serializers.CharField(source="skill.value", read_only=True)
    category = serializers.CharField(source="skill.category", read_only=True)

    class Meta:
        model = JobSkill
        fields = ["id", "skill_id", "skill_name", "category", "is_required", "proficiency_level"]
        read_only_fields = ["id", "skill_name", "category"]


class JobSkillWriteSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField(required=True)
    is_required = serializers.BooleanField(default=True)
    proficiency_level = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)


class JobBenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobBenefit
        fields = ["id", "benefit_name", "custom_description", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class JobBenefitWriteSerializer(serializers.Serializer):
    benefit_name = serializers.CharField(max_length=255, required=True)
    custom_description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(default=True)


# ==============================================================================
# Recruiter Serializers
# ==============================================================================


class RecruiterJobCreateUpdateSerializer(serializers.ModelSerializer):
    job_category_id = serializers.PrimaryKeyRelatedField(
        queryset=MasterDataItem.objects.filter(is_active=True),
        source="job_category",
        required=False,
        allow_null=True,
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=MasterDataItem.objects.filter(is_active=True),
        source="department",
        required=False,
        allow_null=True,
    )
    experience_level_id = serializers.PrimaryKeyRelatedField(
        queryset=MasterDataItem.objects.filter(is_active=True),
        source="experience_level",
        required=False,
        allow_null=True,
    )
    work_mode_id = serializers.PrimaryKeyRelatedField(
        queryset=MasterDataItem.objects.filter(is_active=True),
        source="work_mode",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Job
        fields = [
            "job_title",
            "job_category_id",
            "department_id",
            "experience_level_id",
            "employment_type",
            "location",
            "work_mode_id",
            "job_description",
            "requirements",
            "responsibilities",
            "salary_min",
            "salary_max",
            "salary_currency",
            "openings",
            "accepts_cover_letter",
            "promote_on_job_boards",
            "application_deadline",
        ]

    def validate(self, attrs):
        salary_min = attrs.get("salary_min")
        salary_max = attrs.get("salary_max")
        if salary_min is not None and salary_max is not None and salary_max < salary_min:
            raise serializers.ValidationError({"salary_max": "Maximum salary cannot be less than minimum salary."})
        return attrs


class RecruiterJobDetailSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_logo = serializers.CharField(source="company.logo_url", read_only=True)
    job_category = MasterDataSummarySerializer(read_only=True)
    department = MasterDataSummarySerializer(read_only=True)
    experience_level = MasterDataSummarySerializer(read_only=True)
    work_mode = MasterDataSummarySerializer(read_only=True)
    stages = JobStageSerializer(many=True, read_only=True)
    skills = JobSkillSerializer(many=True, read_only=True)
    benefits = JobBenefitSerializer(many=True, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    applications_count = serializers.SerializerMethodField()
    completion_score = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company_name",
            "company_logo",
            "job_category",
            "department",
            "experience_level",
            "employment_type",
            "location",
            "work_mode",
            "job_description",
            "requirements",
            "responsibilities",
            "salary_min",
            "salary_max",
            "salary_currency",
            "openings",
            "accepts_cover_letter",
            "promote_on_job_boards",
            "job_status",
            "is_draft",
            "on_hold_reason",
            "application_deadline",
            "published_at",
            "draft_saved_at",
            "closed_at",
            "filled_at",
            "created_at",
            "updated_at",
            "stages",
            "skills",
            "benefits",
            "is_expired",
            "applications_count",
            "completion_score",
            "missing_fields",
        ]

    def get_applications_count(self, obj):
        if hasattr(obj, "applications"):
            return obj.applications.count()
        return 0

    def get_completion_score(self, obj):
        from apps.jobs.services import calculate_job_completion
        score, _ = calculate_job_completion(obj)
        return score

    def get_missing_fields(self, obj):
        from apps.jobs.services import calculate_job_completion
        _, missing = calculate_job_completion(obj)
        return missing


class RecruiterJobListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.value", read_only=True)
    category_name = serializers.CharField(source="job_category.value", read_only=True)
    work_mode_name = serializers.CharField(source="work_mode.value", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    applications_count = serializers.SerializerMethodField()
    completion_score = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "department_name",
            "category_name",
            "work_mode_name",
            "location",
            "employment_type",
            "job_status",
            "is_draft",
            "openings",
            "salary_min",
            "salary_max",
            "salary_currency",
            "application_deadline",
            "published_at",
            "draft_saved_at",
            "closed_at",
            "on_hold_reason",
            "is_expired",
            "created_at",
            "updated_at",
            "applications_count",
            "completion_score",
            "missing_fields",
        ]

    def get_applications_count(self, obj):
        if hasattr(obj, "applications"):
            return obj.applications.count()
        return 0

    def get_completion_score(self, obj):
        from apps.jobs.services import calculate_job_completion
        score, _ = calculate_job_completion(obj)
        return score

    def get_missing_fields(self, obj):
        from apps.jobs.services import calculate_job_completion
        _, missing = calculate_job_completion(obj)
        return missing


# ==============================================================================
# Public & Candidate Serializers
# ==============================================================================


class PublicCompanySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "logo_url",
            "cover_image_url",
            "city",
            "state",
            "country",
            "company_size",
            "website_url",
            "verification_status",
        ]


class PublicJobCardSerializer(serializers.ModelSerializer):
    company = PublicCompanySummarySerializer(read_only=True)
    job_category = MasterDataSummarySerializer(read_only=True)
    department = MasterDataSummarySerializer(read_only=True)
    experience_level = MasterDataSummarySerializer(read_only=True)
    work_mode = MasterDataSummarySerializer(read_only=True)
    skills = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company",
            "job_category",
            "department",
            "experience_level",
            "work_mode",
            "employment_type",
            "location",
            "salary_min",
            "salary_max",
            "salary_currency",
            "openings",
            "published_at",
            "application_deadline",
            "is_expired",
            "skills",
            "is_saved",
        ]

    def get_skills(self, obj):
        return [
            {
                "id": js.skill.id,
                "name": js.skill.value,
                "is_required": js.is_required,
                "proficiency_level": js.proficiency_level,
            }
            for js in obj.skills.select_related("skill").all()
        ]

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        saved_job_ids = self.context.get("saved_job_ids")
        if saved_job_ids is not None:
            return obj.id in saved_job_ids
        return SavedJob.objects.filter(
            candidate__user=request.user,
            job=obj,
        ).exists()


class PublicJobDetailSerializer(serializers.ModelSerializer):
    company = PublicCompanySummarySerializer(read_only=True)
    job_category = MasterDataSummarySerializer(read_only=True)
    department = MasterDataSummarySerializer(read_only=True)
    experience_level = MasterDataSummarySerializer(read_only=True)
    work_mode = MasterDataSummarySerializer(read_only=True)
    skills = JobSkillSerializer(many=True, read_only=True)
    benefits = JobBenefitSerializer(many=True, read_only=True)
    is_saved = serializers.SerializerMethodField()
    my_application = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    views_count = serializers.SerializerMethodField()
    applicants_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company",
            "job_category",
            "department",
            "experience_level",
            "work_mode",
            "employment_type",
            "location",
            "job_description",
            "requirements",
            "responsibilities",
            "salary_min",
            "salary_max",
            "salary_currency",
            "openings",
            "accepts_cover_letter",
            "promote_on_job_boards",
            "job_status",
            "published_at",
            "application_deadline",
            "is_expired",
            "skills",
            "benefits",
            "is_saved",
            "my_application",
            "views_count",
            "applicants_count",
        ]

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return SavedJob.objects.filter(
            candidate__user=request.user,
            job=obj,
        ).exists()

    def get_my_application(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None
        from apps.applications.models import Application
        app = Application.objects.filter(job=obj, candidate__user=request.user).first()
        if not app:
            return None
        return {
            "id": app.id,
            "status": app.application_status,
            "applied_at": app.applied_at,
        }

    def get_views_count(self, obj):
        from apps.jobs.models import ViewEvent
        return ViewEvent.objects.filter(entity_type="job", entity_id=obj.id).count()

    def get_applicants_count(self, obj):
        from apps.applications.models import Application
        return Application.objects.filter(job=obj).count()


class SavedJobSerializer(serializers.ModelSerializer):
    job = PublicJobCardSerializer(read_only=True)

    class Meta:
        model = SavedJob
        fields = ["id", "saved_at", "job"]
        read_only_fields = ["id", "saved_at", "job"]


# ==============================================================================
# Admin Serializers
# ==============================================================================


class AdminJobListSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_verified = serializers.CharField(source="company.verification_status", read_only=True)
    creator_email = serializers.CharField(source="created_by.email", read_only=True)
    category_name = serializers.CharField(source="job_category.value", read_only=True)
    department_name = serializers.CharField(source="department.value", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    reports_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company_id",
            "company_name",
            "company_verified",
            "creator_email",
            "category_name",
            "department_name",
            "employment_type",
            "location",
            "job_status",
            "is_draft",
            "openings",
            "published_at",
            "application_deadline",
            "is_expired",
            "created_at",
            "on_hold_reason",
            "reports_count",
        ]

    def get_reports_count(self, obj):
        return Report.objects.filter(target_type="job", target_id=obj.id).count()


class EntityNoteSerializer(serializers.ModelSerializer):
    added_by_name = serializers.CharField(source="added_by.full_name", read_only=True)
    added_by_email = serializers.CharField(source="added_by.email", read_only=True)

    class Meta:
        model = EntityNote
        fields = [
            "id",
            "entity_type",
            "entity_id",
            "note_text",
            "added_by_name",
            "added_by_email",
            "is_internal",
            "created_at",
        ]
        read_only_fields = ["id", "added_by_name", "added_by_email", "created_at"]


class ReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.CharField(source="reporter.email", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "target_type",
            "target_id",
            "reason",
            "title",
            "description",
            "status",
            "reporter_email",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = ["id", "reporter_email", "created_at", "resolved_at"]
