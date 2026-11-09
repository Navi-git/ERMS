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
            "benefits",
            "talent_tracks",
            "created_at",
            "updated_at",
        ]

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
        child=serializers.IntegerField(),
        required=False,
    )

