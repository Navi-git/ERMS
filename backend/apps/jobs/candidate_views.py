"""Candidate API Views for Saved Jobs and Job Reporting."""
from django.db.models import Q
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.candidates.models import CandidateProfile
from apps.jobs.models import Job, SavedJob
from apps.jobs.permissions import IsCandidateUser
from apps.jobs.serializers import ReportSerializer, SavedJobSerializer
from apps.jobs.services import flag_job_for_review, toggle_saved_job
from shared.exceptions.api import ApiError


class SavedJobPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 50


class CandidateSavedJobsView(APIView):
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request):
        profile = getattr(request.user, "candidate_profile", None)
        if not profile:
            raise ApiError(
                code="no_candidate_profile",
                message="You must create a candidate profile to view saved jobs.",
                status_code=400,
            )

        queryset = (
            SavedJob.objects.filter(candidate=profile)
            .select_related(
                "job",
                "job__company",
                "job__job_category",
                "job__department",
                "job__experience_level",
                "job__work_mode",
            )
            .prefetch_related("job__skills__skill")
            .order_by("-saved_at")
        )

        # Filter by work mode (e.g. Remote, Hybrid, On-site)
        work_mode = request.query_params.get("work_mode", "").strip().lower()
        if work_mode and work_mode != "all":
            queryset = queryset.filter(
                Q(job__work_mode__key__icontains=work_mode)
                | Q(job__work_mode__value__icontains=work_mode)
                | Q(job__location__icontains=work_mode)
            )

        # Search term in saved jobs
        q = request.query_params.get("q", "").strip()
        if q:
            queryset = queryset.filter(
                Q(job__job_title__icontains=q) | Q(job__company__name__icontains=q)
            )

        # Sort
        sort = request.query_params.get("sort", "recent")
        if sort == "salary_desc":
            queryset = queryset.order_by("-job__salary_max", "-saved_at")
        else:
            queryset = queryset.order_by("-saved_at")

        paginator = SavedJobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = SavedJobSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class CandidateToggleSavedJobView(APIView):
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def post(self, request, job_id):
        job = Job.objects.filter(id=job_id).first()
        if not job:
            raise ApiError(code="job_not_found", message="Job not found.", status_code=404)

        result = toggle_saved_job(request.user, job)
        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request, job_id):
        profile = getattr(request.user, "candidate_profile", None)
        if not profile:
            raise ApiError(
                code="no_candidate_profile",
                message="Candidate profile required.",
                status_code=400,
            )

        deleted_count, _ = SavedJob.objects.filter(candidate=profile, job_id=job_id).delete()
        if deleted_count == 0:
            raise ApiError(code="not_saved", message="Job is not in your saved list.", status_code=404)

        return Response(status=status.HTTP_204_NO_CONTENT)


class JobReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        job = Job.objects.filter(id=id).first()
        if not job:
            raise ApiError(code="job_not_found", message="Job posting not found.", status_code=404)

        reason = request.data.get("reason", "").strip()
        if not reason:
            raise ApiError(code="reason_required", message="Please provide a reason for reporting this job.", status_code=400)

        description = request.data.get("description", "").strip()
        report = flag_job_for_review(job, request.user, reason, description)
        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)

