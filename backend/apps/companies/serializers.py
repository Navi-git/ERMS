from rest_framework import serializers
from apps.master_data.serializers import MasterDataItemSerializer
from .models import (
    Company,
    CompanyBenefit,
    CompanyTalentTrack,
    CompanyReview,
    CompanyVerificationStatus,
)


class PublicCompanyBenefitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyBenefit
        fields = ["id", "name", "custom_description", "display_order"]


class PublicCompanyReviewSerializer(serializers.ModelSerializer):
    reviewer_badge = serializers.SerializerMethodField()

    class Meta:
        model = CompanyReview
        fields = [
            "id",
            "rating",
            "review_title",
            "review_text",
            "reviewer_badge",
            "eligibility_reason",
            "created_at",
        ]

    def get_reviewer_badge(self, obj):
        if obj.is_anonymous:
            return "Verified Candidate (Anonymous)"
        return getattr(obj.candidate.user, "full_name", None) or "Verified Candidate"


class CreateCompanyReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5, required=True)
    review_title = serializers.CharField(max_length=150, required=True)
    review_text = serializers.CharField(
        min_length=30,
        max_length=2000,
        required=True,
        error_messages={"min_length": "Review text must be at least 30 characters."},
    )
    is_anonymous = serializers.BooleanField(default=False)
    eligibility_reason = serializers.CharField(max_length=20, default="OFFER_RECEIVED")


class PublicCompanyListSerializer(serializers.ModelSerializer):
    industry = MasterDataItemSerializer(read_only=True)
    open_roles_count = serializers.SerializerMethodField()
    rating_average = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "description",
            "logo_url",
            "cover_image_url",
            "website_url",
            "industry",
            "company_size",
            "city",
            "state",
            "country",
            "verification_status",
            "open_roles_count",
            "rating_average",
            "created_at",
        ]

    def get_open_roles_count(self, obj):
        # Open roles count will integrate with apps.jobs when Module 6 is built
        return 0

    def get_rating_average(self, obj):
        reviews = obj.reviews.filter(moderation_status="APPROVED")
        if not reviews.exists():
            return None
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)


class PublicCompanyDetailSerializer(serializers.ModelSerializer):
    industry = MasterDataItemSerializer(read_only=True)
    benefits = serializers.SerializerMethodField()
    talent_tracks = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    reviews_summary = serializers.SerializerMethodField()
    open_roles = serializers.SerializerMethodField()

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
            "media",
            "verification_status",
            "benefits",
            "talent_tracks",
            "reviews",
            "reviews_summary",
            "open_roles",
            "created_at",
        ]

    def get_benefits(self, obj):
        active_benefits = obj.benefits.filter(is_active=True).order_by("display_order", "id")
        return PublicCompanyBenefitSerializer(active_benefits, many=True).data

    def get_talent_tracks(self, obj):
        return [
            {
                "id": tt.master_data_item.id,
                "key": tt.master_data_item.key,
                "label": tt.master_data_item.value,
            }
            for tt in obj.talent_tracks.select_related("master_data_item")
        ]

    def get_reviews(self, obj):
        approved_reviews = obj.reviews.filter(moderation_status="APPROVED").order_by("-created_at")[:10]
        return PublicCompanyReviewSerializer(approved_reviews, many=True).data

    def get_reviews_summary(self, obj):
        approved_reviews = list(obj.reviews.filter(moderation_status="APPROVED"))
        total = len(approved_reviews)
        if total == 0:
            return {
                "average_rating": 0,
                "total_reviews": 0,
                "counts": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            }
        avg = round(sum(r.rating for r in approved_reviews) / total, 1)
        counts = {i: sum(1 for r in approved_reviews if r.rating == i) for i in range(1, 6)}
        return {
            "average_rating": avg,
            "total_reviews": total,
            "counts": counts,
        }

    def get_open_roles(self, obj):
        # Open roles list will link to jobs.Job when Module 6 is built
        return []
