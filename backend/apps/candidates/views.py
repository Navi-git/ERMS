"""Views for Candidate Profile, Education, Experience, Skills, Resumes, and Recruiter Search."""
from decimal import Decimal
import os

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied, ValidationError as DjangoValidationError
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied, ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.candidates.models import CandidateProfile, Resume
from apps.candidates.permissions import IsCandidateUser, IsRecruiterUser
from apps.candidates.serializers import (
    CandidateProfileSerializer,
    CandidateProfileUpdateSerializer,
    CandidateSkillCreateSerializer,
    CandidateSkillSerializer,
    EducationSerializer,
    ExperienceSerializer,
    ResumeAnalysisSerializer,
    ResumeSerializer,
    ResumeUploadSerializer,
)
from apps.candidates.services.profile_service import (
    add_or_update_candidate_skill,
    create_education,
    create_experience,
    delete_candidate_skill,
    delete_education,
    delete_experience,
    get_or_create_profile,
    list_education,
    list_experience,
    update_education,
    update_experience,
    update_profile,
)
from apps.candidates.services.resume_service import (
    archive_resume,
    unarchive_resume,
    get_resume_for_download,
    run_ats_analysis,
    set_default_resume,
    upload_resume,
)
from apps.candidates.services.search_service import search_candidates_for_recruiter


class CandidateProfileView(APIView):
    """GET and PATCH /api/v1/candidate/profile/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        serializer = CandidateProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        profile = get_or_create_profile(request.user)
        serializer = CandidateProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = update_profile(profile, serializer.validated_data)
        out_serializer = CandidateProfileSerializer(updated)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class CandidateEducationListCreateView(APIView):
    """GET and POST /api/v1/candidate/education/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        edus = list_education(profile)
        serializer = EducationSerializer(edus, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = EducationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        edu = create_education(profile, serializer.validated_data)
        return Response(EducationSerializer(edu).data, status=status.HTTP_201_CREATED)


class CandidateEducationDetailView(APIView):
    """PUT, PATCH, DELETE /api/v1/candidate/education/<int:pk>/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def put(self, request, pk):
        profile = get_or_create_profile(request.user)
        serializer = EducationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            edu = update_education(profile, pk, serializer.validated_data)
            return Response(EducationSerializer(edu).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        profile = get_or_create_profile(request.user)
        serializer = EducationSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            edu = update_education(profile, pk, serializer.validated_data)
            return Response(EducationSerializer(edu).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        profile = get_or_create_profile(request.user)
        deleted = delete_education(profile, pk)
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "Education record not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateExperienceListCreateView(APIView):
    """GET and POST /api/v1/candidate/experience/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        exps = list_experience(profile)
        serializer = ExperienceSerializer(exps, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ExperienceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exp = create_experience(profile, serializer.validated_data)
        return Response(ExperienceSerializer(exp).data, status=status.HTTP_201_CREATED)


class CandidateExperienceDetailView(APIView):
    """PUT, PATCH, DELETE /api/v1/candidate/experience/<int:pk>/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def put(self, request, pk):
        profile = get_or_create_profile(request.user)
        serializer = ExperienceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            exp = update_experience(profile, pk, serializer.validated_data)
            return Response(ExperienceSerializer(exp).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        profile = get_or_create_profile(request.user)
        serializer = ExperienceSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            exp = update_experience(profile, pk, serializer.validated_data)
            return Response(ExperienceSerializer(exp).data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        profile = get_or_create_profile(request.user)
        deleted = delete_experience(profile, pk)
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "Experience record not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateSkillsView(APIView):
    """GET, POST, PUT /api/v1/candidate/skills/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        skills = profile.skills.all()
        serializer = CandidateSkillSerializer(skills, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = CandidateSkillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            skill_obj = add_or_update_candidate_skill(
                profile=profile,
                skill_id=serializer.validated_data.get("skill_id"),
                custom_skill_name=serializer.validated_data.get("custom_skill_name"),
                proficiency_level=serializer.validated_data.get("proficiency_level"),
                years_of_experience=serializer.validated_data.get("years_of_experience"),
            )
            return Response(CandidateSkillSerializer(skill_obj).data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        """Batch update candidate skills."""
        profile = get_or_create_profile(request.user)
        skills_data = request.data
        if not isinstance(skills_data, list):
            return Response({"detail": "Expected a list of skills."}, status=status.HTTP_400_BAD_REQUEST)

        # Remove existing skills and add new batch
        profile.skills.all().delete()
        created_skills = []
        for item in skills_data:
            s = CandidateSkillCreateSerializer(data=item)
            if s.is_valid():
                obj = add_or_update_candidate_skill(
                    profile=profile,
                    skill_id=s.validated_data.get("skill_id"),
                    custom_skill_name=s.validated_data.get("custom_skill_name"),
                    proficiency_level=s.validated_data.get("proficiency_level"),
                    years_of_experience=s.validated_data.get("years_of_experience"),
                )
                created_skills.append(obj)

        return Response(CandidateSkillSerializer(created_skills, many=True).data, status=status.HTTP_200_OK)


class CandidateSkillDetailView(APIView):
    """DELETE /api/v1/candidate/skills/<int:pk>/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def delete(self, request, pk):
        profile = get_or_create_profile(request.user)
        deleted = delete_candidate_skill(profile, pk)
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "Skill not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeListCreateView(APIView):
    """GET and POST /api/v1/candidate/resumes/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        profile = get_or_create_profile(request.user)
        include_archived = request.query_params.get("include_archived", "false").lower() in ["1", "true", "yes"]
        qs = profile.resumes.all()
        if not include_archived:
            qs = qs.filter(archived_at__isnull=True)
        serializer = ResumeSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = get_or_create_profile(request.user)
        serializer = ResumeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            resume = upload_resume(
                candidate=profile,
                uploaded_file=serializer.validated_data["file"],
                title=serializer.validated_data.get("title"),
                is_default=serializer.validated_data.get("is_default", False),
            )
            return Response(ResumeSerializer(resume).data, status=status.HTTP_201_CREATED)
        except (ValidationError, Exception) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class CandidateResumeDetailView(APIView):
    """GET and DELETE /api/v1/candidate/resumes/<int:pk>/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def get(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            resume = profile.resumes.get(id=pk)
            return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            archive_resume(profile, pk)
            return Response({"detail": "Resume archived successfully."}, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeSetDefaultView(APIView):
    """POST /api/v1/candidate/resumes/<int:pk>/set-default/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def post(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            resume = set_default_resume(profile, pk)
            return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found or archived."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeArchiveView(APIView):
    """POST /api/v1/candidate/resumes/<int:pk>/archive/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def post(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            resume = archive_resume(profile, pk)
            return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeUnarchiveView(APIView):
    """POST /api/v1/candidate/resumes/<int:pk>/unarchive/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def post(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            resume = unarchive_resume(profile, pk)
            return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeAnalyzeView(APIView):
    """POST /api/v1/candidate/resumes/<int:pk>/analyze/"""
    permission_classes = [IsAuthenticated, IsCandidateUser]

    def post(self, request, pk):
        profile = get_or_create_profile(request.user)
        try:
            resume = profile.resumes.get(id=pk)
            analysis = run_ats_analysis(resume)
            return Response(ResumeAnalysisSerializer(analysis).data, status=status.HTTP_200_OK)
        except Resume.DoesNotExist:
            return Response({"detail": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)


class CandidateResumeDownloadView(APIView):
    """GET /api/v1/candidate/resumes/<int:pk>/download/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            file_path, file_name, file_type = get_resume_for_download(request.user, pk)
            response = FileResponse(open(file_path, "rb"), content_type=file_type)
            response["Content-Disposition"] = f'attachment; filename="{file_name}"'
            return response
        except (DRFPermissionDenied, DjangoPermissionDenied) as pe:
            return Response({"detail": str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except (DRFValidationError, DjangoValidationError) as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecruiterCandidateSearchView(APIView):
    """GET /api/v1/recruiter/candidates/"""
    permission_classes = [IsAuthenticated, IsRecruiterUser]

    def get(self, request):
        q = request.query_params.get("q")
        skills = request.query_params.get("skills")
        location = request.query_params.get("location")
        seeking_status = request.query_params.get("seeking_status")

        exp_min = None
        exp_max = None
        try:
            if request.query_params.get("experience_min"):
                exp_min = float(request.query_params["experience_min"])
            if request.query_params.get("experience_max"):
                exp_max = float(request.query_params["experience_max"])
        except ValueError:
            pass

        results = search_candidates_for_recruiter(
            q=q,
            skills=skills,
            location=location,
            experience_min=exp_min,
            experience_max=exp_max,
            seeking_status=seeking_status,
        )
        return Response(results, status=status.HTTP_200_OK)
