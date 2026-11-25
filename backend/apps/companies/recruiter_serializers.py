from rest_framework import serializers
from apps.master_data.models import MasterDataItem
from apps.master_data.serializers import MasterDataItemSerializer
from .models import Company, CompanyBenefit, CompanyTalentTrack


class CompanyBenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyBenefit
        fields = [
            "id",
            "name",
            "custom_description",
            "display_order",
            "is_active",
            "created_at",
        ]


class RecruiterCompanySerializer(serializers.ModelSerializer):
    industry = MasterDataItemSerializer(read_only=True)
    benefits = serializers.SerializerMethodField()
    talent_tracks = serializers.SerializerMethodField()
    open_roles_count = serializers.SerializerMethodField()
    jobs = serializers.SerializerMethodField()
    is_profile_completed = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "description",
            "industry",
            "founded_year",
            "company_size",
            "logo_url",
            "cover_image_url",
            "website_url",
            "headquarters_address",
            "city",
            "state",
            "country",
            "postal_code",
            "registration_number",
            "tax_id",
            "verification_status",
            "is_profile_completed",
            "benefits",
            "talent_tracks",
            "open_roles_count",
            "jobs",
            "created_at",
            "updated_at",
        ]

    def get_is_profile_completed(self, obj):
        return bool(
            obj.name
            and obj.description
            and obj.industry_id
            and obj.company_size
            and (obj.city or obj.headquarters_address)
        )

    def get_open_roles_count(self, obj):
        from apps.jobs.models import JobStatus
        return obj.jobs.filter(job_status=JobStatus.PUBLISHED).count()

    def get_jobs(self, obj):
        from apps.jobs.serializers import RecruiterJobListSerializer
        jobs = obj.jobs.select_related(
            "job_category", "department", "experience_level", "work_mode"
        ).order_by("-updated_at")
        return RecruiterJobListSerializer(jobs, many=True).data

    def get_benefits(self, obj):
        benefits = obj.benefits.all().order_by("display_order", "id")
        return CompanyBenefitSerializer(benefits, many=True).data

    def get_talent_tracks(self, obj):
        return [
            {
                "id": tt.master_data_item.id,
                "key": tt.master_data_item.key,
                "label": tt.master_data_item.value,
            }
            for tt in obj.talent_tracks.select_related("master_data_item")
        ]


class RecruiterCompanyUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    industry_id = serializers.IntegerField(required=False, allow_null=True)
    company_size = serializers.CharField(max_length=50, required=False, allow_blank=True)
    founded_year = serializers.IntegerField(required=False, allow_null=True)
    website_url = serializers.CharField(max_length=500, required=False, allow_blank=True)
    headquarters_address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    talent_track_ids = serializers.ListField(
        required=False,
    )

