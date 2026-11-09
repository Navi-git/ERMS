from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from .admin_serializers import (
    AdminCompanyQueueItemSerializer,
    AdminCompanyVerificationDetailSerializer,
    AdminRejectVerificationSerializer,
    AdminSaveNoteSerializer,
)
from .admin_services import (
    add_internal_note,
    approve_company_verification,
    get_company_verification_detail,
    list_company_verifications_queue,
    reject_company_verification,
    start_verification_review,
)


class AdminQueuePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class AdminCompanyQueueView(APIView):
    """
    GET /api/v1/admin/companies/
    Super Admin Company Verification Queue (Figma Page 9).
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")
        risk_level = request.query_params.get("risk_level")
        industry = request.query_params.get("industry")

        queryset, stats = list_company_verifications_queue(
            search=search,
            status=status_param,
            risk_level=risk_level,
            industry=industry,
        )

        paginator = AdminQueuePagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = AdminCompanyQueueItemSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data["stats"] = stats
            return response

        serializer = AdminCompanyQueueItemSerializer(queryset, many=True)
        return Response({"results": serializer.data, "stats": stats})


class AdminCompanyDetailView(APIView):
    """
    GET /api/v1/admin/companies/<int:pk>/
    Full verification review details for a company (Figma Page 10).
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, pk):
        company = get_company_verification_detail(pk)
        serializer = AdminCompanyVerificationDetailSerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCompanyStartReviewView(APIView):
    """POST /api/v1/admin/companies/<int:pk>/start-review/"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        company = start_verification_review(pk, request.user)
        serializer = AdminCompanyVerificationDetailSerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCompanyApproveView(APIView):
    """POST /api/v1/admin/companies/<int:pk>/approve/"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        risk_score = request.data.get("risk_score")
        risk_level = request.data.get("risk_level")
        company = approve_company_verification(
            pk, request.user, risk_score=risk_score, risk_level=risk_level
        )
        serializer = AdminCompanyVerificationDetailSerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCompanyRejectView(APIView):
    """POST /api/v1/admin/companies/<int:pk>/reject/"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        serializer = AdminRejectVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        company = reject_company_verification(
            pk, request.user, serializer.validated_data["rejection_reason"]
        )
        return Response(AdminCompanyVerificationDetailSerializer(company).data, status=status.HTTP_200_OK)


class AdminCompanySaveNoteView(APIView):
    """POST /api/v1/admin/companies/<int:pk>/notes/"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        serializer = AdminSaveNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        notes = add_internal_note(pk, request.user, serializer.validated_data["note"])
        return Response({"notes": notes}, status=status.HTTP_200_OK)

