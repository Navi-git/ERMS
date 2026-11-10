from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from shared.exceptions.api import ApiError
from shared.constants.roles import Role
from apps.jobs.models import Job
from apps.companies.models import Company
from apps.candidates.models import CandidateProfile
from apps.applications.models import (
    Application,
    ApplicationStatus,
    ApplicationMaterial,
    ApplicationNote,
)
from apps.applications.serializers import (
    ApplyJobSerializer,
    CandidateApplicationListSerializer,
    CandidateApplicationDetailSerializer,
    RecruiterApplicantListSerializer,
    RecruiterApplicantDetailSerializer,
    ApplicationMaterialSerializer,
    ApplicationNoteSerializer,
)
from apps.applications.services.transition_service import ApplicationTransitionService
from apps.applications.services.ats_service import AtsMatchService


# ==============================================================================
# Helper Permission Functions
# ==============================================================================


def get_candidate_profile(user):
    if getattr(user, "role", "") != Role.CANDIDATE:
        raise ApiError(code="candidate_only", message="Only candidates can access this resource.", status_code=403)
    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    return profile


def get_recruiter_company(user):
    if getattr(user, "role", "") != Role.RECRUITER and not getattr(user, "is_superuser", False):
        raise ApiError(code="recruiter_only", message="Only recruiters can access this resource.", status_code=403)
    company = Company.objects.filter(admin_user=user).first()
    if not company and getattr(user, "company", None):
        company = user.company
    if not company:
        raise ApiError(code="company_not_found", message="No recruiter company profile linked.", status_code=404)
    return company


# ==============================================================================
# Candidate Application Endpoints
# ==============================================================================


class JobApplyView(APIView):
    """POST /api/v1/jobs/<int:id>/apply/ - Candidate applies to a job."""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = ApplyJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        application = ApplicationTransitionService.apply_to_job(
            candidate_user=request.user,
            job_id=id,
            resume_id=data.get("resume_id"),
            linkedin_url=data.get("linkedin_url"),
            portfolio_url=data.get("portfolio_url"),
            message_to_hiring_manager=data.get("message_to_hiring_manager"),
            cover_letter=data.get("cover_letter"),
            source=data.get("source", "direct"),
            materials=data.get("materials", []),
        )

        return Response(
            {
                "message": "Application submitted successfully.",
                "application": CandidateApplicationDetailSerializer(application, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CandidateApplicationListView(APIView):
    """GET /api/v1/candidate/applications/ - List candidate's submitted applications."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_candidate_profile(request.user)
        status_filter = request.query_params.get("status", "").strip().lower()
        search_query = request.query_params.get("search", "").strip()

        qs = (
            Application.objects.filter(candidate=profile)
            .select_related("job", "job__company", "job__department")
            .prefetch_related("stage_progresses__job_stage")
            .order_by("-applied_at")
        )

        if status_filter and status_filter != "all":
            if status_filter == "interview":
                qs = qs.filter(application_status=ApplicationStatus.INTERVIEW_SCHEDULED)
            else:
                qs = qs.filter(application_status=status_filter)

        if search_query:
            qs = qs.filter(
                models.Q(job__job_title__icontains=search_query)
                | models.Q(job__company__name__icontains=search_query)
            )

        serializer = CandidateApplicationListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CandidateApplicationDetailView(APIView):
    """GET /api/v1/candidate/applications/<int:id>/ - Full candidate application view."""
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        profile = get_candidate_profile(request.user)
        try:
            application = (
                Application.objects.select_related("job", "job__company", "job__department", "resume")
                .prefetch_related("stage_progresses__job_stage", "materials", "job__stages")
                .get(id=id, candidate=profile)
            )
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        serializer = CandidateApplicationDetailSerializer(application, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CandidateApplicationWithdrawView(APIView):
    """POST /api/v1/candidate/applications/<int:id>/withdraw/ - Candidate withdraws application."""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        profile = get_candidate_profile(request.user)
        try:
            application = Application.objects.get(id=id, candidate=profile)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        app = ApplicationTransitionService.withdraw(application, request.user)
        return Response(
            {
                "message": "Application withdrawn successfully.",
                "application_status": app.application_status,
                "withdrawn_at": app.withdrawn_at,
            },
            status=status.HTTP_200_OK,
        )


class CandidateApplicationMaterialsView(APIView):
    """GET, POST /api/v1/candidate/applications/<int:id>/materials/ - Manage supplemental application documents."""
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        profile = get_candidate_profile(request.user)
        try:
            app = Application.objects.get(id=id, candidate=profile)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        serializer = ApplicationMaterialSerializer(app.materials.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, id):
        profile = get_candidate_profile(request.user)
        try:
            app = Application.objects.get(id=id, candidate=profile)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        if app.materials.count() >= 5:
            raise ApiError(
                code="max_materials_exceeded",
                message="Cannot attach more than 5 materials to an application.",
                status_code=400,
            )

        serializer = ApplicationMaterialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        material = serializer.save(application=app)
        return Response(ApplicationMaterialSerializer(material).data, status=status.HTTP_201_CREATED)


class CandidateApplicationMaterialDeleteView(APIView):
    """DELETE /api/v1/candidate/applications/<int:id>/materials/<int:mid>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, id, mid):
        profile = get_candidate_profile(request.user)
        try:
            mat = ApplicationMaterial.objects.get(id=mid, application_id=id, application__candidate=profile)
        except ApplicationMaterial.DoesNotExist:
            raise ApiError(code="material_not_found", message="Material attachment not found.", status_code=404)

        mat.delete()
        return Response({"message": "Material removed."}, status=status.HTTP_200_OK)


# ==============================================================================
# Recruiter Application Tracking Endpoints
# ==============================================================================


class RecruiterApplicationListView(APIView):
    """GET /api/v1/recruiter/applications/ - Recruiter all applicants directory with metrics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_recruiter_company(request.user)
        status_filter = request.query_params.get("status", "").strip().lower()
        job_id = request.query_params.get("job_id")
        search_query = request.query_params.get("search", "").strip()
        min_score = request.query_params.get("min_score")

        base_qs = Application.objects.filter(job__company=company)

        # High-level funnel metrics
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        total_applicants = base_qs.count()
        new_today = base_qs.filter(applied_at__gte=today_start).count()
        action_required = base_qs.filter(
            application_status__in=[ApplicationStatus.APPLIED, ApplicationStatus.REVIEWING]
        ).count()

        qs = (
            base_qs.select_related("candidate__user", "job", "job__company", "job__department", "resume")
            .prefetch_related("stage_progresses__job_stage", "candidate__skills__skill")
            .order_by("-applied_at")
        )

        if job_id:
            qs = qs.filter(job_id=job_id)

        if status_filter and status_filter != "all":
            if status_filter == "interview":
                qs = qs.filter(application_status=ApplicationStatus.INTERVIEW_SCHEDULED)
            else:
                qs = qs.filter(application_status=status_filter)

        if search_query:
            qs = qs.filter(
                models.Q(candidate__user__first_name__icontains=search_query)
                | models.Q(candidate__user__last_name__icontains=search_query)
                | models.Q(candidate__user__email__icontains=search_query)
                | models.Q(job__job_title__icontains=search_query)
            )

        items = list(qs)

        # On-the-fly ATS score filter if requested
        if min_score:
            try:
                threshold = int(min_score)
                filtered = []
                for app in items:
                    match_res = AtsMatchService.calculate_match(app)
                    if match_res["match_percentage"] >= threshold:
                        filtered.append(app)
                items = filtered
            except ValueError:
                pass

        serializer = RecruiterApplicantListSerializer(items, many=True, context={"request": request})
        return Response(
            {
                "metrics": {
                    "total_applicants": total_applicants,
                    "new_today": new_today,
                    "action_required": action_required,
                },
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class RecruiterJobApplicantsView(APIView):
    """GET /api/v1/recruiter/jobs/<int:job_id>/applications/ - Applicants for a specific job (Kanban)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        company = get_recruiter_company(request.user)
        try:
            job = Job.objects.prefetch_related("stages", "skills__skill").get(id=job_id, company=company)
        except Job.DoesNotExist:
            raise ApiError(code="job_not_found", message="Job not found for this company.", status_code=404)

        qs = (
            Application.objects.filter(job=job)
            .select_related("candidate__user", "resume")
            .prefetch_related("stage_progresses__job_stage", "candidate__skills__skill")
            .order_by("-applied_at")
        )

        serializer = RecruiterApplicantListSerializer(qs, many=True, context={"request": request})
        stages_data = [
            {
                "id": s.id,
                "name": s.name,
                "type": s.stage_type,
                "order": s.stage_order,
            }
            for s in job.stages.order_by("stage_order", "id")
        ]

        return Response(
            {
                "job": {
                    "id": job.id,
                    "title": job.job_title,
                    "department": job.department.value if job.department else "",
                    "total_applications": qs.count(),
                },
                "stages": stages_data,
                "applications": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class RecruiterApplicationDetailView(APIView):
    """GET /api/v1/recruiter/applications/<int:id>/ - Recruiter screening dossier with ATS breakdown."""
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            application = (
                Application.objects.select_related(
                    "candidate__user",
                    "job",
                    "job__company",
                    "job__department",
                    "resume",
                    "resume__analysis",
                )
                .prefetch_related(
                    "stage_progresses__job_stage",
                    "materials",
                    "notes__author",
                    "job__stages",
                    "job__skills__skill",
                    "candidate__experiences",
                    "candidate__educations",
                    "candidate__skills__skill",
                )
                .get(id=id, job__company=company)
            )
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        # First review hook (Decision #5)
        ApplicationTransitionService.record_first_review(application, request.user)

        serializer = RecruiterApplicantDetailSerializer(application, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RecruiterApplicationStageMoveView(APIView):
    """POST /api/v1/recruiter/applications/<int:id>/stage/ - Move applicant to target stage."""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            application = Application.objects.select_related("job").get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        target_stage_id = request.data.get("target_stage_id")
        notes = request.data.get("notes", "")

        if not target_stage_id:
            raise ApiError(code="target_stage_required", message="target_stage_id is required.", status_code=400)

        progress = ApplicationTransitionService.move_stage(
            application=application,
            target_stage_id=target_stage_id,
            changed_by=request.user,
            notes=notes,
        )

        return Response(
            {
                "message": "Applicant moved to new stage.",
                "application_status": application.application_status,
                "current_stage": {
                    "id": progress.job_stage.id,
                    "name": progress.job_stage.name,
                    "type": progress.job_stage.stage_type,
                },
            },
            status=status.HTTP_200_OK,
        )


class RecruiterApplicationShortlistView(APIView):
    """POST /api/v1/recruiter/applications/<int:id>/shortlist/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            application = Application.objects.get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        app = ApplicationTransitionService.shortlist(application, request.user)
        return Response({"message": "Application shortlisted.", "application_status": app.application_status})


class RecruiterApplicationRejectView(APIView):
    """POST /api/v1/recruiter/applications/<int:id>/reject/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            application = Application.objects.get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        rejection_reason = request.data.get("rejection_reason", "").strip()
        app = ApplicationTransitionService.reject(application, request.user, rejection_reason)
        return Response(
            {
                "message": "Application rejected.",
                "application_status": app.application_status,
                "rejected_at": app.rejected_at,
            }
        )


class RecruiterApplicationHireView(APIView):
    """POST /api/v1/recruiter/applications/<int:id>/hire/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            application = Application.objects.get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        app = ApplicationTransitionService.hire(application, request.user)
        return Response(
            {
                "message": "Candidate marked as hired.",
                "application_status": app.application_status,
                "hired_at": app.hired_at,
            }
        )


class RecruiterApplicationNotesView(APIView):
    """GET, POST /api/v1/recruiter/applications/<int:id>/notes/ - Recruiter private collaboration notes."""
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            app = Application.objects.get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        serializer = ApplicationNoteSerializer(app.notes.all(), many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, id):
        company = get_recruiter_company(request.user)
        try:
            app = Application.objects.get(id=id, job__company=company)
        except Application.DoesNotExist:
            raise ApiError(code="application_not_found", message="Application not found.", status_code=404)

        note_text = request.data.get("note", "").strip()
        if not note_text:
            raise ApiError(code="note_required", message="Note text cannot be empty.", status_code=400)

        note = ApplicationNote.objects.create(
            application=app,
            author=request.user,
            note=note_text,
            is_internal=True,
        )
        return Response(
            ApplicationNoteSerializer(note, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class RecruiterApplicationNoteDetailView(APIView):
    """PATCH, DELETE /api/v1/recruiter/applications/<int:id>/notes/<int:nid>/ - Author-only edit/delete (Decision #12)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, id, nid):
        company = get_recruiter_company(request.user)
        try:
            note = ApplicationNote.objects.get(id=nid, application_id=id, application__job__company=company)
        except ApplicationNote.DoesNotExist:
            raise ApiError(code="note_not_found", message="Note not found.", status_code=404)

        if note.author_id != request.user.id and not getattr(request.user, "is_superuser", False):
            raise ApiError(code="permission_denied", message="You can only edit your own notes.", status_code=403)

        note_text = request.data.get("note", "").strip()
        if not note_text:
            raise ApiError(code="note_required", message="Note text cannot be empty.", status_code=400)

        note.note = note_text
        note.save(update_fields=["note", "updated_at"])
        return Response(ApplicationNoteSerializer(note, context={"request": request}).data, status=status.HTTP_200_OK)

    def delete(self, request, id, nid):
        company = get_recruiter_company(request.user)
        try:
            note = ApplicationNote.objects.get(id=nid, application_id=id, application__job__company=company)
        except ApplicationNote.DoesNotExist:
            raise ApiError(code="note_not_found", message="Note not found.", status_code=404)

        if note.author_id != request.user.id and not getattr(request.user, "is_superuser", False):
            raise ApiError(code="permission_denied", message="You can only delete your own notes.", status_code=403)

        note.delete()
        return Response({"message": "Note deleted successfully."}, status=status.HTTP_200_OK)
