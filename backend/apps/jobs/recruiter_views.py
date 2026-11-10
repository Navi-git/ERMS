"""Recruiter API Views for Job Management, Skills, Benefits, and Stages."""
from django.db.models import Q
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.companies.models import Company
from apps.jobs.models import Job, JobStage, JobStatus
from apps.jobs.permissions import IsRecruiterUser
from apps.jobs.serializers import (
    JobBenefitSerializer,
    JobBenefitWriteSerializer,
    JobSkillSerializer,
    JobSkillWriteSerializer,
    JobStageSerializer,
    RecruiterJobCreateUpdateSerializer,
    RecruiterJobDetailSerializer,
    RecruiterJobListSerializer,
)
from apps.jobs.services import (
    close_job,
    create_job_draft,
    delete_job_draft,
    mark_job_filled,
    publish_job,
    put_job_on_hold,
    reorder_stages,
    resume_job,
    sync_job_benefits,
    sync_job_skills,
    update_job,
)
from shared.exceptions.api import ApiError


class JobPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def get_recruiter_company(user):
    company = Company.objects.filter(admin_user=user).first()
    if not company:
        raise ApiError(
            code="no_company_found",
            message="You must have an associated company to manage jobs.",
            status_code=400,
        )
    return company


def get_recruiter_job(user, job_id):
    company = get_recruiter_company(user)
    job = Job.objects.filter(id=job_id, company=company).first()
    if not job:
        raise ApiError(
            code="job_not_found",
            message="Job posting not found or you do not have permission to view it.",
            status_code=404,
        )
    return job


class RecruiterJobListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def get(self, request):
        company = get_recruiter_company(request.user)
        queryset = Job.objects.filter(company=company).select_related(
            "job_category", "department", "experience_level", "work_mode"
        ).order_by("-updated_at")

        # Summary stats across all recruiter's jobs
        summary = {
            "total_jobs": queryset.count(),
            "active_jobs": queryset.filter(job_status=JobStatus.PUBLISHED).count(),
            "draft_jobs": queryset.filter(job_status=JobStatus.DRAFT).count(),
            "on_hold_jobs": queryset.filter(job_status=JobStatus.ON_HOLD).count(),
            "closed_jobs": queryset.filter(job_status=JobStatus.CLOSED).count(),
        }

        # Filter by status
        status_filter = request.query_params.get("status", "").strip().lower()
        if status_filter == "active" or status_filter == "published":
            queryset = queryset.filter(job_status=JobStatus.PUBLISHED)
        elif status_filter == "draft":
            queryset = queryset.filter(job_status=JobStatus.DRAFT)
        elif status_filter == "on_hold":
            queryset = queryset.filter(job_status=JobStatus.ON_HOLD)
        elif status_filter == "closed":
            queryset = queryset.filter(job_status=JobStatus.CLOSED)

        # Filter by department
        dept_id = request.query_params.get("department")
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)

        # Search term in title
        query = request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(job_title__icontains=query)

        paginator = JobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = RecruiterJobListSerializer(page, many=True)
        response = paginator.get_paginated_response(serializer.data)
        response.data["summary"] = summary
        return response

    def post(self, request):
        serializer = RecruiterJobCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = create_job_draft(request.user, serializer.validated_data)
        return Response(RecruiterJobDetailSerializer(job).data, status=status.HTTP_201_CREATED)


class RecruiterJobDetailView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def get(self, request, id):
        job = get_recruiter_job(request.user, id)
        return Response(RecruiterJobDetailSerializer(job).data)

    def patch(self, request, id):
        job = get_recruiter_job(request.user, id)
        serializer = RecruiterJobCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_job(job, serializer.validated_data)
        return Response(RecruiterJobDetailSerializer(updated).data)

    def delete(self, request, id):
        job = get_recruiter_job(request.user, id)
        delete_job_draft(job)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecruiterJobPublishView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        published = publish_job(job)
        return Response(RecruiterJobDetailSerializer(published).data)


class RecruiterJobHoldView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        reason = request.data.get("reason", "")
        updated = put_job_on_hold(job, reason)
        return Response(RecruiterJobDetailSerializer(updated).data)


class RecruiterJobResumeView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        updated = resume_job(job)
        return Response(RecruiterJobDetailSerializer(updated).data)


class RecruiterJobCloseView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        updated = close_job(job)
        return Response(RecruiterJobDetailSerializer(updated).data)


class RecruiterJobMarkFilledView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        updated = mark_job_filled(job)
        return Response(RecruiterJobDetailSerializer(updated).data)


class RecruiterJobOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def get(self, request, id):
        job = get_recruiter_job(request.user, id)
        stages = job.stages.filter(is_active=True).order_by("stage_order")
        
        from apps.applications.models import Application, ApplicationStatus
        from apps.applications.services.ats_service import AtsMatchService

        applications = Application.objects.filter(job=job)
        total_applications = applications.count()
        active_pipeline = applications.exclude(
            application_status__in=[
                ApplicationStatus.REJECTED,
                ApplicationStatus.WITHDRAWN,
                ApplicationStatus.ACCEPTED,
            ]
        ).count()

        scores = []
        for app in applications.select_related("resume", "candidate"):
            try:
                match_data = AtsMatchService.calculate_match(app)
                scores.append(match_data.get("match_percentage", 0))
            except Exception:
                pass
        average_ats_score = round(sum(scores) / len(scores)) if scores else 0

        stage_counts = {s.id: 0 for s in stages}
        for app in applications.prefetch_related("stage_progresses__job_stage"):
            latest = (
                app.stage_progresses.filter(completed_at__isnull=True)
                .order_by("-started_at")
                .first()
            )
            if not latest:
                latest = app.stage_progresses.order_by("-started_at").first()
            if latest and latest.job_stage_id in stage_counts:
                stage_counts[latest.job_stage_id] += 1

        stages_summary = [
            {
                "id": s.id,
                "name": s.name,
                "stage_order": s.stage_order,
                "stage_type": s.stage_type,
                "count": stage_counts.get(s.id, 0),
            }
            for s in stages
        ]

        overview_data = {
            "job": RecruiterJobDetailSerializer(job).data,
            "metrics": {
                "total_applications": total_applications,
                "average_ats_score": average_ats_score,
                "time_to_fill_days": 30,
                "active_pipeline": active_pipeline,
            },
            "stages_summary": stages_summary,
        }
        return Response(overview_data)


class RecruiterJobSkillsView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def put(self, request, id):
        job = get_recruiter_job(request.user, id)
        skills_data = request.data if isinstance(request.data, list) else request.data.get("skills", [])
        serializer = JobSkillWriteSerializer(data=skills_data, many=True)
        serializer.is_valid(raise_exception=True)
        skills = sync_job_skills(job, serializer.validated_data)
        return Response(JobSkillSerializer(skills, many=True).data)


class RecruiterJobBenefitsView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def put(self, request, id):
        job = get_recruiter_job(request.user, id)
        benefits_data = request.data if isinstance(request.data, list) else request.data.get("benefits", [])
        serializer = JobBenefitWriteSerializer(data=benefits_data, many=True)
        serializer.is_valid(raise_exception=True)
        benefits = sync_job_benefits(job, serializer.validated_data)
        return Response(JobBenefitSerializer(benefits, many=True).data)


class RecruiterJobStagesListView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def get(self, request, id):
        job = get_recruiter_job(request.user, id)
        stages = job.stages.all().order_by("stage_order")
        return Response(JobStageSerializer(stages, many=True).data)

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        serializer = JobStageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Compute next stage_order if not provided
        last_stage = job.stages.order_by("-stage_order").first()
        next_order = (last_stage.stage_order + 1) if last_stage else 1

        stage = JobStage.objects.create(
            job=job,
            name=serializer.validated_data["name"],
            stage_order=serializer.validated_data.get("stage_order", next_order),
            stage_type=serializer.validated_data.get("stage_type", "custom"),
            description=serializer.validated_data.get("description"),
            is_required=serializer.validated_data.get("is_required", True),
            is_active=serializer.validated_data.get("is_active", True),
        )
        return Response(JobStageSerializer(stage).data, status=status.HTTP_201_CREATED)


class RecruiterJobStageDetailView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def patch(self, request, id, sid):
        job = get_recruiter_job(request.user, id)
        stage = job.stages.filter(id=sid).first()
        if not stage:
            raise ApiError(code="stage_not_found", message="Hiring stage not found.", status_code=404)

        serializer = JobStageSerializer(stage, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id, sid):
        job = get_recruiter_job(request.user, id)
        stage = job.stages.filter(id=sid).first()
        if not stage:
            raise ApiError(code="stage_not_found", message="Hiring stage not found.", status_code=404)

        stage.delete()
        # Re-index remaining stages
        remaining = list(job.stages.order_by("stage_order"))
        for order, st in enumerate(remaining, start=1):
            if st.stage_order != order:
                st.stage_order = order
                st.save(update_fields=["stage_order"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecruiterJobStagesReorderView(APIView):
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def post(self, request, id):
        job = get_recruiter_job(request.user, id)
        stage_ids = request.data.get("stage_ids", [])
        if not stage_ids or not isinstance(stage_ids, list):
            raise ApiError(code="invalid_stage_ids", message="A list of stage IDs is required.", status_code=400)

        updated = reorder_stages(job, stage_ids)
        return Response(JobStageSerializer(updated, many=True).data)

