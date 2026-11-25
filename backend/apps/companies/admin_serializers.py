from rest_framework import serializers
from apps.master_data.serializers import MasterDataItemSerializer
from .models import (
    Company,
    CompanyVerification,
    CompanyVerificationDocument,
    CompanyVerificationStatus,
    RiskLevel,
)


class AdminCompanyQueueItemSerializer(serializers.ModelSerializer):
    industry = MasterDataItemSerializer(read_only=True)
    submission_date = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()
    status = serializers.CharField(source="verification_status")

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "registration_number",
            "tax_id",
            "industry",
            "company_size",
            "city",
            "state",
            "submission_date",
            "risk_level",
            "risk_score",
            "status",
            "created_at",
        ]

    def get_latest_verification(self, obj):
        if not hasattr(obj, "_latest_verif"):
            obj._latest_verif = obj.verifications.order_by("-submitted_at").first()
        return obj._latest_verif

    def get_submission_date(self, obj):
        verif = self.get_latest_verification(obj)
        return verif.submitted_at if verif else obj.created_at

    def get_risk_level(self, obj):
        verif = self.get_latest_verification(obj)
        return verif.risk_level if verif else "LOW"

    def get_risk_score(self, obj):
        verif = self.get_latest_verification(obj)
        return verif.risk_score if verif else 10.0


class AdminCompanyVerificationDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.SerializerMethodField()

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
            "uploaded_by_email",
            "uploaded_at",
        ]

    def get_uploaded_by_email(self, obj):
        return obj.uploaded_by.email if obj.uploaded_by else None


class AdminCompanyVerificationDetailSerializer(serializers.ModelSerializer):
    industry = MasterDataItemSerializer(read_only=True)
    admin_user = serializers.SerializerMethodField()
    talent_tracks = serializers.SerializerMethodField()
    verification = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "description",
            "registration_number",
            "tax_id",
            "industry",
            "company_size",
            "founded_year",
            "website_url",
            "headquarters_address",
            "city",
            "state",
            "country",
            "postal_code",
            "logo_url",
            "cover_image_url",
            "verification_status",
            "admin_user",
            "talent_tracks",
            "verification",
            "documents",
            "created_at",
            "updated_at",
        ]

    def get_admin_user(self, obj):
        if not obj.admin_user:
            return None
        return {
            "id": obj.admin_user.id,
            "email": obj.admin_user.email,
            "full_name": getattr(obj.admin_user, "full_name", None) or obj.admin_user.email,
            "phone": getattr(obj.admin_user, "phone", None),
        }

    def get_talent_tracks(self, obj):
        return [
            {
                "id": tt.master_data_item.id,
                "key": tt.master_data_item.key,
                "label": tt.master_data_item.value,
            }
            for tt in obj.talent_tracks.select_related("master_data_item")
        ]

    def get_verification(self, obj):
        verif = obj.verifications.order_by("-submitted_at").first()
        if not verif:
            return None
        return {
            "id": verif.id,
            "status": verif.status,
            "risk_score": verif.risk_score,
            "risk_level": verif.risk_level,
            "intended_hiring_min": verif.intended_hiring_min,
            "intended_hiring_max": verif.intended_hiring_max,
            "review_history": verif.review_history or [],
            "internal_notes": verif.internal_notes,
            "rejection_reason": verif.rejection_reason,
            "submitted_at": verif.submitted_at,
            "reviewed_at": verif.reviewed_at,
            "reviewed_by": verif.reviewed_by.email if verif.reviewed_by else None,
        }

    def get_documents(self, obj):
        verif = obj.verifications.order_by("-submitted_at").first()
        if not verif:
            return []
        docs = verif.documents.all().order_by("-is_current", "document_type")
        return AdminCompanyVerificationDocumentSerializer(docs, many=True).data


class AdminRejectVerificationSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(
        min_length=10,
        max_length=1000,
        required=True,
        error_messages={"min_length": "Please provide a detailed rejection reason (at least 10 characters)."},
    )


class AdminSaveNoteSerializer(serializers.Serializer):
    note = serializers.CharField(
        min_length=2,
        max_length=2000,
        required=True,
    )
