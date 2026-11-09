from rest_framework import serializers
from apps.master_data.serializers import MasterDataItemSerializer
from .models import (
    Company,
    CompanyVerification,
    CompanyVerificationDocument,
    CompanyVerificationStatus,
    VerificationDocumentType,
)


class CompanyVerificationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyVerificationDocument
        fields = [
            "id",
            "document_type",
            "original_filename",
            "file_size",
            "checksum_sha256",
            "status",
            "is_current",
            "uploaded_at",
        ]


class CompanyVerificationDetailSerializer(serializers.ModelSerializer):
    documents = serializers.SerializerMethodField()
    company_details = serializers.SerializerMethodField()

    class Meta:
        model = CompanyVerification
        fields = [
            "id",
            "status",
            "risk_score",
            "risk_level",
            "intended_hiring_min",
            "intended_hiring_max",
            "rejection_reason",
            "review_history",
            "submitted_at",
            "reviewed_at",
            "documents",
            "company_details",
        ]

    def get_documents(self, obj):
        current_docs = obj.documents.filter(is_current=True).order_by("document_type")
        return CompanyVerificationDocumentSerializer(current_docs, many=True).data

    def get_company_details(self, obj):
        comp = obj.company
        return {
            "id": comp.id,
            "name": comp.name,
            "registration_number": comp.registration_number,
            "tax_id": comp.tax_id,
            "website_url": comp.website_url,
            "company_size": comp.company_size,
            "industry": MasterDataItemSerializer(comp.industry).data if comp.industry else None,
            "headquarters_address": comp.headquarters_address,
            "city": comp.city,
            "state": comp.state,
            "country": comp.country,
            "postal_code": comp.postal_code,
            "talent_tracks": [
                {
                    "id": tt.master_data_item.id,
                    "key": tt.master_data_item.key,
                    "label": tt.master_data_item.value,
                }
                for tt in comp.talent_tracks.select_related("master_data_item")
            ],
        }


class VerificationSaveDraftSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tax_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    website_url = serializers.CharField(max_length=500, required=False, allow_blank=True)
    company_size = serializers.CharField(max_length=50, required=False, allow_blank=True)
    industry_id = serializers.IntegerField(required=False, allow_null=True)
    headquarters_address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    intended_hiring_min = serializers.IntegerField(required=False, allow_null=True)
    intended_hiring_max = serializers.IntegerField(required=False, allow_null=True)
    talent_track_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )

