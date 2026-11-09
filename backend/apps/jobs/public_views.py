"""Public API Views for Job Search, Filtering, and Detail inspection."""
from django.db.models import Q
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.companies.models import Company, CompanyVerificationStatus
from apps.jobs.models import Job, JobStatus, SavedJob
from apps.jobs.serializers import PublicJobCardSerializer, PublicJobDetailSerializer
from apps.jobs.services import record_job_view
from shared.exceptions.api import ApiError


class PublicJobPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 50


class PublicJobListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        queryset = (
            Job.objects.filter(
                job_status=JobStatus.PUBLISHED,
                company__verification_status=CompanyVerificationStatus.APPROVED,
                company__suspended_at__isnull=True,
            )
            .filter(Q(application_deadline__isnull=True) | Q(application_deadline__gt=now))
            .select_related("company", "job_category", "department", "experience_level", "work_mode")
            .prefetch_related("skills__skill")
        )

        # Keyword search (q)
        q = request.query_params.get("q", "").strip()
        if q:
            queryset = queryset.filter(
                Q(job_title__icontains=q)
                | Q(company__name__icontains=q)
                | Q(job_description__icontains=q)
                | Q(requirements__icontains=q)
                | Q(responsibilities__icontains=q)
                | Q(skills__skill__value__icontains=q)
            ).distinct()

        # Location filter
        location = request.query_params.get("location", "").strip()
        if location:
            queryset = queryset.filter(
                Q(location__icontains=location)
                | Q(company__city__icontains=location)
                | Q(company__state__icontains=location)
                | Q(company__country__icontains=location)
            )

        # Category filter
        cat = request.query_params.get("category")
        if cat:
            queryset = queryset.filter(job_category_id=cat)

        # Department filter
        dept = request.query_params.get("department")
        if dept:
            queryset = queryset.filter(department_id=dept)

        # Experience Level filter
        exp = request.query_params.get("experience_level")
        if exp:
            queryset = queryset.filter(experience_level_id=exp)

        # Employment Type filter
        emp_type = request.query_params.get("employment_type")
        if emp_type:
            queryset = queryset.filter(employment_type=emp_type)

        # Work Mode filter
        work_mode = request.query_params.get("work_mode")
        if work_mode:
            queryset = queryset.filter(work_mode_id=work_mode)

        # Remote only convenience filter
        remote_only = request.query_params.get("remote_only")
        if remote_only and remote_only.lower() in ["true", "1", "yes"]:
            queryset = queryset.filter(
                Q(work_mode__key__icontains="remote")
                | Q(location__icontains="remote")
                | Q(work_mode__value__icontains="remote")
            )

        # Salary filters
        sal_min = request.query_params.get("salary_min")
        if sal_min:
            try:
                queryset = queryset.filter(salary_max__gte=float(sal_min))
            except ValueError:
                pass

        sal_max = request.query_params.get("salary_max")
        if sal_max:
            try:
                queryset = queryset.filter(salary_min__lte=float(sal_max))
            except ValueError:
                pass

        # Company filter
        company_id = request.query_params.get("company_id")
        if company_id:
            queryset = queryset.filter(company_id=company_id)

        # Specific skills filter (comma-separated skill IDs)
        skills_param = request.query_params.get("skills")
        if skills_param:
            try:
                skill_ids = [int(s.strip()) for s in skills_param.split(",") if s.strip()]
                if skill_ids:
                    queryset = queryset.filter(skills__skill_id__in=skill_ids).distinct()
            except ValueError:
                pass

        # Sorting
        sort = request.query_params.get("sort", "newest").lower()
        if sort == "salary_desc":
            queryset = queryset.order_by("-salary_max", "-published_at")
        elif sort == "oldest":
            queryset = queryset.order_by("published_at")
        else:  # newest / default
            queryset = queryset.order_by("-published_at", "-created_at")

        # Context pre-population for saved jobs
        saved_job_ids = set()
        if request.user and request.user.is_authenticated:
            profile = getattr(request.user, "candidate_profile", None)
            if profile:
                saved_job_ids = set(
                    SavedJob.objects.filter(candidate=profile).values_list("job_id", flat=True)
                )

        paginator = PublicJobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = PublicJobCardSerializer(
            page,
            many=True,
            context={"request": request, "saved_job_ids": saved_job_ids},
        )
        return paginator.get_paginated_response(serializer.data)


class PublicJobDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, id):
        job = (
            Job.objects.filter(id=id)
            .select_related("company", "job_category", "department", "experience_level", "work_mode")
            .prefetch_related("skills__skill", "benefits")
            .first()
        )

        if not job:
            raise ApiError(code="job_not_found", message="Job posting not found.", status_code=404)

        # Allow recruiters or super admin to view their own non-published jobs
        is_owner = (
            request.user
            and request.user.is_authenticated
            and (
                job.created_by_id == request.user.id
                or getattr(request.user, "role", "") == "super_admin"
                or getattr(request.user, "is_superuser", False)
            )
        )

        if not is_owner:
            if job.job_status != JobStatus.PUBLISHED:
                raise ApiError(
                    code="job_not_available",
                    message="This job posting is no longer active or available.",
                    status_code=404,
                )
            if job.company.verification_status != CompanyVerificationStatus.APPROVED or job.company.suspended_at:
                raise ApiError(
                    code="company_not_verified",
                    message="This job posting is currently unavailable.",
                    status_code=404,
                )

        # Record view event hook (Decision #12)
        record_job_view(job, request.user)

        serializer = PublicJobDetailSerializer(job, context={"request": request})
        return Response(serializer.data)


class CompanyJobsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, id):
        company = Company.objects.filter(id=id).first()
        if not company:
            raise ApiError(code="company_not_found", message="Company not found.", status_code=404)

        now = timezone.now()
        queryset = (
            Job.objects.filter(
                company=company,
                job_status=JobStatus.PUBLISHED,
            )
            .filter(Q(application_deadline__isnull=True) | Q(application_deadline__gt=now))
            .select_related("company", "job_category", "department", "experience_level", "work_mode")
            .prefetch_related("skills__skill")
            .order_by("-published_at")
        )

        paginator = PublicJobPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = PublicJobCardSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

