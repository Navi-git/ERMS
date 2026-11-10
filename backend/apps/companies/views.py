from django.db.models import Count, Q
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Company, CompanyVerificationStatus
from .serializers import PublicCompanyListSerializer, PublicCompanyDetailSerializer


class StandardResultsPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 50


class PublicCompanyListView(APIView):
    """
    GET /api/v1/companies/
    Publicly browsable list of companies for candidates and guest visitors (Figma Page 1).
    Supports keyword search, industry filtering, company size filtering, and returns
    industry distribution statistics for sidebar facets.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Company.objects.all().select_related("industry")

        # In production, optionally filter by verification_status=APPROVED
        # For development and initial seeding, include all companies unless explicitly specified
        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(verification_status=status_param.upper())

        # Search query (name, description, location)
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(city__icontains=search_query)
                | Q(state__icontains=search_query)
            )

        # Industry filter (key or ID, supports comma-separated)
        industry_param = request.query_params.get("industry")
        if industry_param:
            industries = [ind.strip() for ind in industry_param.split(",") if ind.strip()]
            queryset = queryset.filter(
                Q(industry__key__in=industries) | Q(industry__value__in=industries)
            )

        # Company Size filter (e.g. Startup, Mid-size, Enterprise)
        company_size_param = request.query_params.get("company_size")
        if company_size_param:
            sizes = [s.strip() for s in company_size_param.split(",") if s.strip()]
            queryset = queryset.filter(company_size__in=sizes)

        # Location filter
        location_param = request.query_params.get("location", "").strip()
        if location_param:
            queryset = queryset.filter(
                Q(city__icontains=location_param)
                | Q(state__icontains=location_param)
                | Q(country__icontains=location_param)
            )

        # Order by newest
        queryset = queryset.order_by("-created_at")

        # Industry distribution facets for the sidebar
        distribution_counts = (
            Company.objects.filter(industry__isnull=False)
            .values("industry__key", "industry__value")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        industry_distribution = [
            {
                "key": item["industry__key"],
                "label": item["industry__value"],
                "count": item["count"],
            }
            for item in distribution_counts
        ]

        # Featured Profiles (Companies with cover image and logo, or top active)
        featured_qs = Company.objects.filter(cover_image_url__isnull=False).exclude(cover_image_url="")[:4]
        if not featured_qs.exists():
            featured_qs = Company.objects.all()[:4]
        featured_data = PublicCompanyListSerializer(featured_qs, many=True).data

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = PublicCompanyListSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data["industry_distribution"] = industry_distribution
            response.data["featured_profiles"] = featured_data
            return response

        serializer = PublicCompanyListSerializer(queryset, many=True)
        return Response({
            "results": serializer.data,
            "industry_distribution": industry_distribution,
            "featured_profiles": featured_data,
        })


class PublicCompanyDetailView(APIView):
    """
    GET /api/v1/companies/<int:pk>/
    Public company profile details (Figma Page 2).
    Includes benefits, talent tracks, open roles, and reviews.
    Excludes sensitive legal and billing attributes.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            company = (
                Company.objects.select_related("industry")
                .prefetch_related("benefits", "talent_tracks__master_data_item", "reviews")
                .get(pk=pk)
            )
        except Company.DoesNotExist:
            return Response(
                {"detail": "Company not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PublicCompanyDetailSerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)



class CandidateCompanyReviewCreateView(APIView):
    """
    POST /api/v1/companies/<int:pk>/reviews/
    Candidate-authored review and rating for a company (Figma Page 3).
    Gated on candidate authentication and offer/hire eligibility.
    """
    permission_classes = [AllowAny]  # Evaluates role internally

    def post(self, request, pk):
        if not (request.user and request.user.is_authenticated):
            return Response(
                {"detail": "Authentication required to submit a review."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        from django.db import models
        from shared.constants.roles import Role
        from apps.candidates.services.profile_service import get_or_create_profile
        from apps.applications.models import Application
        from .models import CompanyReview, ReviewModerationStatus, ReviewEligibilityReason
        from .serializers import CreateCompanyReviewSerializer, PublicCompanyReviewSerializer

        if getattr(request.user, "role", "") != Role.CANDIDATE:
            return Response(
                {"detail": "Only candidate accounts are eligible to submit company reviews."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            company = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            return Response({"detail": "Company not found."}, status=status.HTTP_404_NOT_FOUND)

        profile = get_or_create_profile(request.user)

        # Enforce offer / hire eligibility (Module 7 Decision)
        eligible_app = (
            Application.objects.filter(candidate=profile, job__company=company)
            .filter(
                models.Q(hired_at__isnull=False)
                | models.Q(offer_extended_at__isnull=False)
                | models.Q(application_status__in=["offer_sent", "accepted"])
            )
            .first()
        )
        if not eligible_app:
            return Response(
                {
                    "detail": "Only candidates who have received an offer letter or have been hired by this company can write a review."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreateCompanyReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_hired = bool(eligible_app.hired_at or eligible_app.application_status == "accepted")
        eligibility = ReviewEligibilityReason.HIRED if is_hired else ReviewEligibilityReason.OFFER_RECEIVED

        review = CompanyReview.objects.create(
            company=company,
            candidate=profile,
            application_id=eligible_app.id,
            rating=serializer.validated_data["rating"],
            review_title=serializer.validated_data["review_title"],
            review_text=serializer.validated_data["review_text"],
            is_anonymous=serializer.validated_data.get("is_anonymous", False),
            eligibility_reason=eligibility,
            moderation_status=ReviewModerationStatus.APPROVED,
        )

        return Response(PublicCompanyReviewSerializer(review).data, status=status.HTTP_201_CREATED)
