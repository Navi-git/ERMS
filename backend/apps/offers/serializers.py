from rest_framework import serializers
from apps.companies.models import CompanyBenefit
from apps.jobs.models import JobBenefit
from apps.master_data.models import MasterDataItem
from .models import Offer, OfferAttachment, OfferLetterTemplate, OfferStatus


class OfferAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferAttachment
        fields = [
            "id",
            "offer_id",
            "file_name",
            "file_url",
            "file_type",
            "file_size",
            "description",
            "uploaded_at",
        ]
        read_only_fields = ["id", "offer_id", "uploaded_at"]


class OfferLetterTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferLetterTemplate
        fields = [
            "id",
            "company_id",
            "template_name",
            "body_template",
            "variables_schema",
            "version",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "company_id", "version", "created_at", "updated_at"]


class RecruiterOfferSerializer(serializers.ModelSerializer):
    attachments = OfferAttachmentSerializer(many=True, read_only=True)
    offer_reference = serializers.CharField(read_only=True)
    total_target_compensation = serializers.IntegerField(read_only=True)
    per_period_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    candidate_name = serializers.CharField(source="application.candidate.user.full_name", read_only=True)
    candidate_email = serializers.CharField(source="application.candidate.user.email", read_only=True)
    candidate_photo = serializers.CharField(source="application.candidate.user.profile_picture_url", read_only=True)
    job_id = serializers.IntegerField(source="application.job_id", read_only=True)
    job_title = serializers.CharField(source="application.job.job_title", read_only=True)
    company_name = serializers.CharField(source="application.job.company.name", read_only=True)
    application_ref = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "offer_reference",
            "application_id",
            "application_ref",
            "candidate_name",
            "candidate_email",
            "candidate_photo",
            "job_id",
            "job_title",
            "company_name",
            "salary",
            "currency",
            "employment_type",
            "pay_frequency",
            "start_date",
            "equity_type",
            "equity_units",
            "equity_vesting_schedule",
            "bonus_type",
            "bonus_target_percent",
            "bonus_target_amount",
            "sign_on_bonus",
            "sign_on_bonus_terms",
            "reports_to_user_id",
            "reporting_manager_name",
            "reporting_manager_title",
            "department",
            "work_arrangement",
            "template_id",
            "letter_content",
            "offer_document_url",
            "status",
            "sent_at",
            "responded_at",
            "expiration_date",
            "decline_reason",
            "candidate_feedback",
            "declined_at",
            "withdrawn_at",
            "withdrawn_reason",
            "attachments",
            "total_target_compensation",
            "per_period_amount",
            "is_expired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "offer_reference",
            "application_id",
            "status",
            "sent_at",
            "responded_at",
            "offer_document_url",
            "declined_at",
            "withdrawn_at",
            "created_at",
            "updated_at",
        ]

    def get_application_ref(self, obj):
        return f"APP-{obj.application_id:04d}"


class CandidateOfferSerializer(serializers.ModelSerializer):
    attachments = OfferAttachmentSerializer(many=True, read_only=True)
    offer_reference = serializers.CharField(read_only=True)
    total_target_compensation = serializers.IntegerField(read_only=True)
    per_period_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    candidate_name = serializers.CharField(source="application.candidate.user.full_name", read_only=True)
    candidate_email = serializers.CharField(source="application.candidate.user.email", read_only=True)
    job_id = serializers.IntegerField(source="application.job_id", read_only=True)
    job_title = serializers.CharField(source="application.job.job_title", read_only=True)
    company_name = serializers.CharField(source="application.job.company.name", read_only=True)
    company_logo = serializers.CharField(source="application.job.company.logo_url", read_only=True)
    company_location = serializers.SerializerMethodField()
    company_verified = serializers.SerializerMethodField()
    hiring_team = serializers.SerializerMethodField()
    benefits = serializers.SerializerMethodField()
    letter_content = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "offer_reference",
            "application_id",
            "candidate_name",
            "candidate_email",
            "job_id",
            "job_title",
            "company_name",
            "company_logo",
            "company_location",
            "company_verified",
            "salary",
            "currency",
            "employment_type",
            "pay_frequency",
            "start_date",
            "equity_type",
            "equity_units",
            "equity_vesting_schedule",
            "bonus_type",
            "bonus_target_percent",
            "bonus_target_amount",
            "sign_on_bonus",
            "sign_on_bonus_terms",
            "reporting_manager_name",
            "reporting_manager_title",
            "department",
            "work_arrangement",
            "letter_content",
            "offer_document_url",
            "status",
            "sent_at",
            "responded_at",
            "expiration_date",
            "decline_reason",
            "candidate_feedback",
            "declined_at",
            "attachments",
            "total_target_compensation",
            "per_period_amount",
            "is_expired",
            "hiring_team",
            "benefits",
            "created_at",
            "updated_at",
        ]

    def get_company_location(self, obj):
        try:
            comp = obj.application.job.company
            parts = [p for p in [comp.city, comp.state, comp.country] if p]
            return ", ".join(parts) if parts else "Remote"
        except Exception:
            return "Remote"

    def get_company_verified(self, obj):
        try:
            return obj.application.job.company.verification_status == "APPROVED"
        except Exception:
            return False

    def get_hiring_team(self, obj):
        team = []
        try:
            if obj.reporting_manager_name:
                team.append({
                    "name": obj.reporting_manager_name,
                    "role": obj.reporting_manager_title or "Reporting Manager",
                    "notes": "Available for team scope & roadmap questions",
                })
            elif obj.reports_to_user:
                team.append({
                    "name": obj.reports_to_user.full_name or obj.reports_to_user.email,
                    "role": obj.reporting_manager_title or "Reporting Manager",
                    "notes": "Available for team scope & roadmap questions",
                })

            creator = obj.created_by
            if creator and (not obj.reports_to_user or creator.id != obj.reports_to_user.id):
                team.append({
                    "name": creator.full_name or creator.email,
                    "role": "Talent Partner",
                    "notes": "Handles offers & start date logistics",
                })
        except Exception:
            pass
        return team

    def get_benefits(self, obj):
        benefits_list = []
        try:
            job = obj.application.job
            company = job.company if job else None

            if company:
                company_benefits = CompanyBenefit.objects.filter(company=company, is_active=True)
                for b in company_benefits:
                    title = getattr(b, "name", None) or getattr(b, "title", "Benefit")
                    desc = getattr(b, "custom_description", None) or getattr(b, "description", "") or ""
                    benefits_list.append({
                        "title": title,
                        "description": desc,
                        "category": "general",
                    })

            if not benefits_list and job:
                job_benefits = JobBenefit.objects.filter(job=job, is_active=True)
                for jb in job_benefits:
                    title = getattr(jb, "benefit_name", None) or getattr(jb, "name", "Benefit")
                    desc = getattr(jb, "custom_description", "") or ""
                    benefits_list.append({
                        "title": title,
                        "description": desc,
                        "category": "general",
                    })
        except Exception:
            pass

        if not benefits_list:
            # Fallback default benefits matching Figma Section B
            benefits_list = [
                {
                    "title": "Comprehensive Healthcare",
                    "description": "100% employer-covered health, dental, and vision insurance premiums for employees and 80% for dependents.",
                    "category": "health",
                },
                {
                    "title": "401(k) Retirement Match",
                    "description": "Dollar-for-dollar 401(k) matching up to 5% of base compensation, immediately vested upon enrollment.",
                    "category": "financial",
                },
                {
                    "title": "Flexible Paid Time Off",
                    "description": "Unlimited flexible PTO policy, 12 paid corporate holidays, and company-wide recharge week in late December.",
                    "category": "pto",
                },
                {
                    "title": "Learning & Home Office Stipend",
                    "description": "$2,500 annual professional development stipend plus top-tier laptop and home office setup allowance.",
                    "category": "equipment",
                },
            ]
        return benefits_list

    def get_letter_content(self, obj):
        try:
            from .services.letter_generator import (
                DEFAULT_OFFER_TEMPLATE,
                build_template_context,
                render_template_text,
            )
            raw = obj.letter_content or (
                obj.template.body_template if obj.template else DEFAULT_OFFER_TEMPLATE
            )
            context = build_template_context(obj)
            return render_template_text(raw, context)
        except Exception:
            return obj.letter_content
