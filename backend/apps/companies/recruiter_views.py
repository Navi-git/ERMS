from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsRecruiter
from .recruiter_serializers import (
    CompanyBenefitSerializer,
    RecruiterCompanySerializer,
    RecruiterCompanyUpdateSerializer,
)
from .recruiter_services import (
    create_or_update_benefit,
    delete_benefit,
    get_or_create_recruiter_company,
    update_company_profile,
    upload_company_branding,
)


class RecruiterCompanyProfileView(APIView):
    """
    GET /api/v1/recruiter/company/
    Retrieve the logged-in recruiter's company profile.

    PATCH /api/v1/recruiter/company/
    Update company basics, address, about markdown, and hiring talent tracks.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        company = get_or_create_recruiter_company(request.user)
        serializer = RecruiterCompanySerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        company = get_or_create_recruiter_company(request.user)
        serializer = RecruiterCompanyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_company = update_company_profile(company, serializer.validated_data)
        return Response(RecruiterCompanySerializer(updated_company).data, status=status.HTTP_200_OK)


class RecruiterCompanyLogoUploadView(APIView):
    """POST /api/v1/recruiter/company/logo/"""
    permission_classes = [IsAuthenticated, IsRecruiter]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        image_file = request.FILES.get("file") or request.FILES.get("logo")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        logo_url = upload_company_branding(company, image_file, field_name="logo_url")
        return Response({"logo_url": logo_url}, status=status.HTTP_200_OK)


class RecruiterCompanyCoverUploadView(APIView):
    """POST /api/v1/recruiter/company/cover/"""
    permission_classes = [IsAuthenticated, IsRecruiter]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        image_file = request.FILES.get("file") or request.FILES.get("cover")
        if not image_file:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        cover_url = upload_company_branding(company, image_file, field_name="cover_image_url")
        return Response({"cover_image_url": cover_url}, status=status.HTTP_200_OK)


class RecruiterCompanyBenefitsView(APIView):
    """
    GET  /api/v1/recruiter/company/benefits/
    POST /api/v1/recruiter/company/benefits/
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        company = get_or_create_recruiter_company(request.user)
        benefits = company.benefits.all().order_by("display_order", "id")
        return Response(CompanyBenefitSerializer(benefits, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        serializer = CompanyBenefitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        benefit = create_or_update_benefit(company, serializer.validated_data)
        return Response(CompanyBenefitSerializer(benefit).data, status=status.HTTP_201_CREATED)


class RecruiterCompanyBenefitDetailView(APIView):
    """
    PATCH  /api/v1/recruiter/company/benefits/<int:pk>/
    DELETE /api/v1/recruiter/company/benefits/<int:pk>/
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def patch(self, request, pk):
        company = get_or_create_recruiter_company(request.user)
        serializer = CompanyBenefitSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        benefit = create_or_update_benefit(company, serializer.validated_data, benefit_id=pk)
        return Response(CompanyBenefitSerializer(benefit).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        company = get_or_create_recruiter_company(request.user)
        delete_benefit(company, pk)
        return Response({"detail": "Benefit deleted successfully."}, status=status.HTTP_200_OK)

