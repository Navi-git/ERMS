from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsRecruiter
from .recruiter_services import get_or_create_recruiter_company
from .verification_serializers import (
    CompanyVerificationDetailSerializer,
    CompanyVerificationDocumentSerializer,
    VerificationSaveDraftSerializer,
)
from .verification_services import (
    get_compliance_document_for_download,
    get_or_create_verification,
    save_verification_draft,
    submit_verification_for_review,
    upload_verification_document,
)


class RecruiterVerificationStatusView(APIView):
    """
    GET /api/v1/recruiter/company/verification/
    Retrieve current verification state, audited documents, and review history.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get(self, request):
        company = get_or_create_recruiter_company(request.user)
        verification = get_or_create_verification(company, request.user)
        serializer = CompanyVerificationDetailSerializer(verification)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RecruiterVerificationDocumentUploadView(APIView):
    """
    POST /api/v1/recruiter/company/verification/documents/
    Upload Certificate of Incorporation, Tax Form, or Business License.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        document_type = request.data.get("document_type")
        file_obj = request.FILES.get("file")

        if not document_type or not file_obj:
            return Response(
                {"detail": "Both document_type and file are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doc = upload_verification_document(
            company=company,
            user=request.user,
            document_type=document_type,
            uploaded_file=file_obj,
        )
        return Response(CompanyVerificationDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class RecruiterVerificationDocumentDownloadView(APIView):
    """
    GET /api/v1/recruiter/company/verification/documents/<int:pk>/download/
    Stream encrypted/private compliance document to authorized recruiter or admin.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        full_path, filename = get_compliance_document_for_download(request.user, pk)
        response = FileResponse(open(full_path, "rb"), as_attachment=True, filename=filename)
        return response


class RecruiterVerificationDraftView(APIView):
    """
    POST /api/v1/recruiter/company/verification/save-draft/
    Save progress on entity overview, hiring scope, and talent tracks.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        serializer = VerificationSaveDraftSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        verification = save_verification_draft(company, request.user, serializer.validated_data)
        return Response(CompanyVerificationDetailSerializer(verification).data, status=status.HTTP_200_OK)


class RecruiterVerificationSubmitView(APIView):
    """
    POST /api/v1/recruiter/company/verification/submit/
    Validate compliance criteria and submit application for review.
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def post(self, request):
        company = get_or_create_recruiter_company(request.user)
        serializer = VerificationSaveDraftSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        verification = submit_verification_for_review(company, request.user, serializer.validated_data)
        return Response(CompanyVerificationDetailSerializer(verification).data, status=status.HTTP_200_OK)

