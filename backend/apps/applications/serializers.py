from rest_framework import serializers
from apps.applications.models import (
    Application,
    ApplicationStageProgress,
    ApplicationMaterial,
    ApplicationNote,
)
from apps.applications.services.ats_service import AtsMatchService
from apps.candidates.models import CandidateProfile, Resume, Experience, Education, CandidateSkill


class ApplicationMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationMaterial
        fields = ["id", "file_name", "file_url", "file_type", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class ApplicationStageProgressSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="job_stage.name", read_only=True)
    stage_type = serializers.CharField(source="job_stage.stage_type", read_only=True)
    stage_order = serializers.IntegerField(source="job_stage.stage_order", read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationStageProgress
        fields = [
            "id",
            "job_stage_id",
            "stage_name",
            "stage_type",
            "stage_order",
            "started_at",
            "completed_at",
            "notes",
            "changed_by_name",
        ]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.full_name or obj.changed_by.email
        return None


class ApplicationNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source="author.email", read_only=True)
    is_author = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationNote
        fields = [
            "id",
            "author_id",
            "author_name",
            "author_email",
            "note",
            "is_internal",
            "created_at",
            "updated_at",
            "is_author",
        ]
        read_only_fields = ["id", "author_id", "author_name", "author_email", "created_at", "updated_at", "is_author"]

    def get_author_name(self, obj):
        return obj.author.full_name or obj.author.email

    def get_is_author(self, obj):
        request = self.context.get("request")
        if not request or not request.user:
            return False
        return obj.author_id == request.user.id


class ApplyJobSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField(required=False, allow_null=True)
    linkedin_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    portfolio_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    message_to_hiring_manager = serializers.CharField(required=False, allow_blank=True, max_length=255)
    cover_letter = serializers.CharField(required=False, allow_blank=True)
    source = serializers.CharField(required=False, default="direct", max_length=50)
    materials = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
    )


# ==============================================================================
# Candidate Serializers (Strictly NO ATS scores exposed to candidate)
# ==============================================================================


class CandidateApplicationListSerializer(serializers.ModelSerializer):
    job_id = serializers.IntegerField(source="job.id", read_only=True)
    job_title = serializers.CharField(source="job.job_title", read_only=True)
    company_name = serializers.CharField(source="job.company.name", read_only=True)
    company_logo = serializers.CharField(source="job.company.logo_url", read_only=True)
    location = serializers.CharField(source="job.location", read_only=True)
    employment_type = serializers.CharField(source="job.employment_type", read_only=True)
    department = serializers.CharField(source="job.department.value", default="", read_only=True)
    current_stage = serializers.SerializerMethodField()
    can_withdraw = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "job_id",
            "job_title",
            "company_name",
            "company_logo",
            "location",
            "employment_type",
            "department",
            "application_status",
            "applied_at",
            "current_stage",
            "reviewed_at",
            "withdrawn_at",
            "rejected_at",
            "rejection_reason",
            "offer_extended_at",
            "hired_at",
            "can_withdraw",
        ]

    def get_current_stage(self, obj):
        latest = obj.stage_progresses.filter(completed_at__isnull=True).order_by("-started_at").first()
        if not latest:
            latest = obj.stage_progresses.order_by("-started_at").first()
        if latest and latest.job_stage:
            return {
                "id": latest.job_stage.id,
                "name": latest.job_stage.name,
                "type": latest.job_stage.stage_type,
            }
        return None

    def get_can_withdraw(self, obj):
        # Eligible to withdraw if active or after offer received
        return obj.application_status not in ["withdrawn", "rejected", "accepted"]


class CandidateApplicationDetailSerializer(CandidateApplicationListSerializer):
    resume = serializers.SerializerMethodField()
    materials = ApplicationMaterialSerializer(many=True, read_only=True)
    pipeline_stepper = serializers.SerializerMethodField()

    class Meta(CandidateApplicationListSerializer.Meta):
        fields = CandidateApplicationListSerializer.Meta.fields + [
            "linkedin_url",
            "portfolio_url",
            "message_to_hiring_manager",
            "cover_letter",
            "resume",
            "materials",
            "pipeline_stepper",
        ]

    def get_resume(self, obj):
        if not obj.resume:
            return None
        return {
            "id": obj.resume.id,
            "title": obj.resume.title,
            "file_url": obj.resume.file_url,
            "file_size": obj.resume.file_size,
            "created_at": obj.resume.uploaded_at,
        }

    def get_pipeline_stepper(self, obj):
        """Constructs an end-to-end visual pipeline stepper with completion status for candidate."""
        job_stages = list(obj.job.stages.order_by("stage_order", "id"))
        active_progress = obj.stage_progresses.filter(completed_at__isnull=True).first()
        active_stage_id = active_progress.job_stage_id if active_progress else None

        completed_stage_ids = set(
            obj.stage_progresses.filter(completed_at__isnull=False).values_list("job_stage_id", flat=True)
        )

        steps = []
        for stage in job_stages:
            is_completed = stage.id in completed_stage_ids and stage.id != active_stage_id
            is_current = stage.id == active_stage_id
            steps.append({
                "id": stage.id,
                "name": stage.name,
                "type": stage.stage_type,
                "order": stage.stage_order,
                "is_completed": is_completed,
                "is_current": is_current,
            })
        return steps


# ==============================================================================
# Recruiter Serializers (Includes On-The-Fly ATS Match & Evaluation Intelligence)
# ==============================================================================


class RecruiterApplicantListSerializer(serializers.ModelSerializer):
    candidate = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()
    current_stage = serializers.SerializerMethodField()
    ats_match = serializers.SerializerMethodField()
    resume_file_url = serializers.CharField(source="resume.file_url", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "candidate",
            "job",
            "application_status",
            "applied_at",
            "reviewed_at",
            "current_stage",
            "ats_match",
            "resume_file_url",
            "withdrawn_at",
            "rejected_at",
            "rejection_reason",
            "offer_extended_at",
            "hired_at",
        ]

    def get_candidate(self, obj):
        prof = obj.candidate
        user = prof.user if prof else None
        return {
            "id": prof.id if prof else None,
            "user_id": user.id if user else None,
            "full_name": user.full_name if user else "Candidate",
            "email": user.email if user else "",
            "profile_picture_url": getattr(user, "profile_picture_url", ""),
            "headline": getattr(prof, "headline", ""),
            "location": getattr(prof, "location", ""),
        }

    def get_job(self, obj):
        job = obj.job
        return {
            "id": job.id,
            "job_title": job.job_title,
            "department": job.department.value if job.department else "",
            "location": job.location,
            "company_name": job.company.name if job.company else "",
        }

    def get_current_stage(self, obj):
        latest = obj.stage_progresses.filter(completed_at__isnull=True).order_by("-started_at").first()
        if not latest:
            latest = obj.stage_progresses.order_by("-started_at").first()
        if latest and latest.job_stage:
            return {
                "id": latest.job_stage.id,
                "name": latest.job_stage.name,
                "type": latest.job_stage.stage_type,
            }
        return None

    def get_ats_match(self, obj):
        return AtsMatchService.calculate_match(obj)


class RecruiterApplicantDetailSerializer(RecruiterApplicantListSerializer):
    candidate_profile = serializers.SerializerMethodField()
    resume = serializers.SerializerMethodField()
    stages = serializers.SerializerMethodField()
    stage_history = ApplicationStageProgressSerializer(source="stage_progresses", many=True, read_only=True)
    materials = ApplicationMaterialSerializer(many=True, read_only=True)
    notes = ApplicationNoteSerializer(many=True, read_only=True)

    class Meta(RecruiterApplicantListSerializer.Meta):
        fields = RecruiterApplicantListSerializer.Meta.fields + [
            "candidate_profile",
            "resume",
            "stages",
            "stage_history",
            "materials",
            "notes",
            "cover_letter",
            "message_to_hiring_manager",
            "linkedin_url",
            "portfolio_url",
            "source",
        ]

    def get_candidate_profile(self, obj):
        prof = obj.candidate
        if not prof:
            return None
        user = prof.user
        experiences = [
            {
                "id": exp.id,
                "company_name": exp.company_name,
                "job_title": exp.job_title,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "is_current": exp.is_current,
                "description": exp.description,
            }
            for exp in prof.experiences.order_by("-start_date")
        ]
        educations = [
            {
                "id": edu.id,
                "institution": edu.institution,
                "degree": edu.degree,
                "field_of_study": edu.field_of_study,
                "start_date": edu.start_date,
                "end_date": edu.end_date,
            }
            for edu in prof.educations.order_by("-end_date")
        ]
        skills = [
            {
                "id": sk.id,
                "name": sk.skill.value if sk.skill else "",
                "proficiency_level": sk.proficiency_level,
                "years_of_experience": sk.years_of_experience,
            }
            for sk in prof.skills.select_related("skill")
        ]
        return {
            "id": prof.id,
            "full_name": user.full_name if user else "Candidate",
            "email": user.email if user else "",
            "phone_number": getattr(prof, "phone_number", ""),
            "profile_picture_url": getattr(user, "profile_picture_url", ""),
            "headline": getattr(prof, "headline", ""),
            "bio": getattr(prof, "bio", ""),
            "location": getattr(prof, "location", ""),
            "experiences": experiences,
            "educations": educations,
            "skills": skills,
        }

    def get_resume(self, obj):
        if not obj.resume:
            return None
        res = obj.resume
        extracted_text = ""
        if hasattr(res, "analysis") and res.analysis and res.analysis.extracted_text:
            extracted_text = res.analysis.extracted_text
        return {
            "id": res.id,
            "title": res.title,
            "file_url": res.file_url,
            "file_size": res.file_size,
            "created_at": res.uploaded_at,
            "extracted_text": extracted_text,
        }

    def get_stages(self, obj):
        """All stages defined on the job for quick stage-movement dropdowns."""
        return [
            {
                "id": s.id,
                "name": s.name,
                "type": s.stage_type,
                "order": s.stage_order,
            }
            for s in obj.job.stages.order_by("stage_order", "id")
        ]
