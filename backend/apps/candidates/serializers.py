"""DRF Serializers for Candidate Profile, Education, Experience, Skills, Resumes, and Search."""
from decimal import Decimal

from rest_framework import serializers

from apps.candidates.models import (
    CandidateProfile,
    CandidateSkill,
    Education,
    Experience,
    ProficiencyLevel,
    Resume,
    ResumeAnalysis,
    SeekingStatus,
)
from apps.candidates.services.profile_service import calculate_completeness


class UserPublicSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    profile_picture_url = serializers.CharField(read_only=True)


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeAnalysis
        fields = [
            "id",
            "ats_score",
            "extracted_text",
            "strengths",
            "weaknesses",
            "missing_keywords",
            "matched_keywords",
            "analysis_result",
            "model_version",
            "analyzed_at",
        ]


class ResumeSerializer(serializers.ModelSerializer):
    analysis = ResumeAnalysisSerializer(read_only=True)
    ats_score = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = [
            "id",
            "title",
            "file_name",
            "file_url",
            "file_type",
            "file_size",
            "is_default",
            "archived_at",
            "uploaded_at",
            "updated_at",
            "analysis",
            "ats_score",
        ]

    def get_ats_score(self, obj) -> int | None:
        if hasattr(obj, "analysis") and obj.analysis:
            return obj.analysis.ats_score
        return None


class ResumeUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    is_default = serializers.BooleanField(required=False, default=False)


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            "id",
            "institution",
            "degree",
            "field_of_study",
            "start_date",
            "end_date",
            "is_currently_studying",
            "gpa",
            "created_at",
        ]

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        is_studying = attrs.get("is_currently_studying", False)
        if start and end and end < start and not is_studying:
            raise serializers.ValidationError({"end_date": "End date cannot be prior to start date."})
        return attrs


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "id",
            "job_title",
            "company_name",
            "employment_type",
            "start_date",
            "end_date",
            "is_current",
            "description",
            "location",
            "created_at",
        ]

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        is_current = attrs.get("is_current", False)
        if start and end and end < start and not is_current:
            raise serializers.ValidationError({"end_date": "End date cannot be prior to start date."})
        return attrs


class CandidateSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = CandidateSkill
        fields = [
            "id",
            "skill",
            "skill_name",
            "category",
            "custom_skill_name",
            "proficiency_level",
            "years_of_experience",
            "created_at",
        ]

    def get_skill_name(self, obj) -> str:
        if obj.skill:
            return obj.skill.value
        return obj.custom_skill_name or ""

    def get_category(self, obj) -> str:
        if obj.skill:
            return obj.skill.category
        return "custom"


class CandidateSkillCreateSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField(required=False, allow_null=True)
    custom_skill_name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    proficiency_level = serializers.ChoiceField(
        choices=ProficiencyLevel.choices,
        default=ProficiencyLevel.INTERMEDIATE,
    )
    years_of_experience = serializers.DecimalField(
        max_digits=3, decimal_places=1, required=False, allow_null=True
    )

    def validate(self, attrs):
        skill_id = attrs.get("skill_id")
        custom_name = attrs.get("custom_skill_name")
        if not skill_id and not (custom_name and custom_name.strip()):
            raise serializers.ValidationError("Either a valid skill_id or custom_skill_name must be provided.")
        return attrs


class CandidateProfileSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    completeness = serializers.SerializerMethodField()
    educations = EducationSerializer(many=True, read_only=True)
    experiences = ExperienceSerializer(many=True, read_only=True)
    skills = CandidateSkillSerializer(many=True, read_only=True)
    resumes = ResumeSerializer(many=True, read_only=True)

    class Meta:
        model = CandidateProfile
        fields = [
            "id",
            "user",
            "headline",
            "summary",
            "current_location",
            "seeking_status",
            "expected_salary_min",
            "expected_salary_max",
            "currency",
            "work_authorization_status",
            "security_clearance",
            "willing_to_relocate",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "completeness",
            "educations",
            "experiences",
            "skills",
            "resumes",
            "created_at",
            "updated_at",
        ]

    def get_completeness(self, obj) -> dict:
        return calculate_completeness(obj)


class CandidateProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProfile
        fields = [
            "headline",
            "summary",
            "current_location",
            "seeking_status",
            "expected_salary_min",
            "expected_salary_max",
            "currency",
            "work_authorization_status",
            "security_clearance",
            "willing_to_relocate",
            "linkedin_url",
            "github_url",
            "portfolio_url",
        ]
