"""Super Admin API Views for Job Directory, Inspection, Moderation, and Notes."""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.jobs.models import EntityNote, Job, JobStatus, Report
from apps.jobs.permissions import IsSuperAdminUser
from apps.jobs.serializers import (
    AdminJobListSerializer,
    EntityNoteSerializer,
    RecruiterJobDetailSerializer,
    ReportSerializer,
)
from apps.jobs.services import flag_job_for_review
from shared.exceptions.api import ApiError


class AdminJobPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminJobListView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]

    def get(self, request):
        queryset = (
            Job.objects.all()
            .select_related("company", "created_by", "job_category", "department")
            .order_by("-created_at")
        )

        # Summary Metrics for Admin Cards (Figma Page 11)
        now = timezone.now()
        reported_job_ids = set(
            Report.objects.filter(target_type="job", status__in=["pending", "in_review"]).values_list(
                "target_id", flat=True
            )
        )

        metrics = {
            "total_listings": Job.objects.count(),
            "active_listings": Job.objects.filter(job_status=JobStatus.PUBLISHED).count(),
            "closed_listings": Job.objects.filter(job_status=JobStatus.CLOSED).count(),
            "on_hold_listings": Job.objects.filter(job_status=JobStatus.ON_HOLD).count(),
            "draft_listings": Job.objects.filter(job_status=JobStatus.DRAFT).count(),
            "reported_listings": len(reported_job_ids),
        }

        # Filter by status tab
        status_filter = request.query_params.get("status", "").strip().lower()
        if status_filter == "active" or status_filter == "published":
            queryset = queryset.filter(job_status=JobStatus.PUBLISHED)
        elif status_filter == "draft":
            queryset = queryset.filter(job_status=JobStatus.DRAFT)
        elif status_filter == "on_hold":
            queryset = queryset.filter(job_status=JobStatus.ON_HOLD)
        elif status_filter == "closed":
            queryset = queryset.filter(job_status=JobStatus.CLOSED)
        elif status_filter == "expired":
            queryset = queryset.filter(application_deadline__lte=now)
        elif status_filter == "reported":
            queryset = queryset.filter(id__in=reported_job_ids)

        # Filter by company
        company_id = request.query_params.get("company_id")
        if company_id:
            queryset = queryset.filter(company_id=company_id)

        # Filter by category
        category_id = request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(job_category_id=category_id)

        # Search term in title, company, or author email
        q = request.query_params.get("q", "").strip()
        if q:
            queryset = queryset.filter(
                Q(job_title__icontains=q)
                | Q(company__name__icontains=q)
                | Q(created_by__email__icontains=q)
            )

        paginator = AdminJobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AdminJobListSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["metrics"] = metrics
        return response


class AdminJobDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]

    def get(self, request, id):
        job = (
            Job.objects.filter(id=id)
            .select_related("company", "created_by", "job_category", "department", "experience_level", "work_mode")
            .prefetch_related("skills__skill", "benefits", "stages")
            .first()
        )
        if not job:
            raise ApiError(code="job_not_found", message="Job posting not found.", status_code=404)

        data = RecruiterJobDetailSerializer(job).data

        # Append admin-specific info (reports, notes)
        reports = Report.objects.filter(target_type="job", target_id=job.id).order_by("-created_at")
        notes = EntityNote.objects.filter(entity_type="job", entity_id=job.id).order_by("-created_at")

        data["reports"] = ReportSerializer(reports, many=True).data
        data["internal_notes"] = EntityNoteSerializer(notes, many=True).data
        data["company_verification_status"] = job.company.verification_status
        data["company_is_suspended"] = bool(job.company.suspended_at)

        return Response(data)


class AdminJobStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]

    def patch(self, request, id):
        job = Job.objects.filter(id=id).first()
        if not job:
            raise ApiError(code="job_not_found", message="Job not found.", status_code=404)

        new_status = request.data.get("status", "").strip().lower()
        reason = request.data.get("reason", "").strip()

        if new_status not in [JobStatus.PUBLISHED, JobStatus.ON_HOLD, JobStatus.CLOSED]:
            raise ApiError(
                code="invalid_status",
                message="Status must be one of: published, on_hold, closed.",
                status_code=400,
            )

        now = timezone.now()
        job.job_status = new_status
        if new_status == JobStatus.ON_HOLD:
            job.on_hold_reason = reason or "Placed on hold by platform administrator."
        elif new_status == JobStatus.CLOSED:
            job.closed_at = now
        elif new_status == JobStatus.PUBLISHED:
            job.on_hold_reason = None
            if not job.published_at:
                job.published_at = now

        job.save()
        return Response(RecruiterJobDetailSerializer(job).data)


class AdminJobFlagView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]

    def post(self, request, id):
        job = Job.objects.filter(id=id).first()
        if not job:
            raise ApiError(code="job_not_found", message="Job not found.", status_code=404)

        reason = request.data.get("reason", "Flagged by platform administrator")
        description = request.data.get("description", "")
        report = flag_job_for_review(job, request.user, reason, description)
        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


class AdminJobNotesView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]

    def get(self, request, id):
        notes = EntityNote.objects.filter(entity_type="job", entity_id=id).order_by("-created_at")
        return Response(EntityNoteSerializer(notes, many=True).data)

    def post(self, request, id):
        job = Job.objects.filter(id=id).first()
        if not job:
            raise ApiError(code="job_not_found", message="Job not found.", status_code=404)

        note_text = request.data.get("note_text", "").strip()
        if not note_text:
            raise ApiError(code="empty_note", message="Note text cannot be empty.", status_code=400)

        note = EntityNote.objects.create(
            entity_type="job",
            entity_id=job.id,
            note_text=note_text,
            added_by=request.user,
            is_internal=True,
        )
        return Response(EntityNoteSerializer(note).data, status=status.HTTP_201_CREATED)

