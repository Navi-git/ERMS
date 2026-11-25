"""Service layer for Resume uploads, private storage, default selection, and ATS analysis."""
from __future__ import annotations

import os
import uuid
from typing import Optional, Tuple

from django.conf import settings
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.candidates.models import CandidateProfile, Resume, ResumeAnalysis
from apps.candidates.services.ats_analyzer import analyze_resume_content, extract_text_from_file

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


def _get_private_resume_dir(candidate_id: int) -> str:
    storage_root = getattr(settings, "PRIVATE_STORAGE_ROOT", settings.BASE_DIR / "storage" / "private")
    resume_dir = os.path.join(str(storage_root), "resumes", f"candidate_{candidate_id}")
    os.makedirs(resume_dir, exist_ok=True)
    return resume_dir


@transaction.atomic
def upload_resume(
    candidate: CandidateProfile,
    uploaded_file,
    title: Optional[str] = None,
    is_default: bool = False,
) -> Resume:
    """Validates, stores resume in private storage, and triggers immediate ATS analysis."""
    # 1. Validate file size
    if uploaded_file.size > MAX_RESUME_SIZE_BYTES:
        raise ValidationError("File size exceeds 5 MB limit.")

    # 2. Validate file extension
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"Unsupported file format '{ext}'. Only PDF and DOCX files are allowed.")

    # 3. Determine default status
    has_active_resumes = candidate.resumes.filter(archived_at__isnull=True).exists()
    if not has_active_resumes or is_default:
        is_default = True
        candidate.resumes.filter(is_default=True).update(is_default=False)

    # 4. Save to private storage
    dest_dir = _get_private_resume_dir(candidate.id)
    unique_name = f"{uuid.uuid4().hex}_{uploaded_file.name.replace(' ', '_')}"
    full_path = os.path.join(dest_dir, unique_name)

    with open(full_path, "wb+") as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    rel_path = os.path.relpath(full_path, str(settings.BASE_DIR))
    title = title.strip() if title and title.strip() else uploaded_file.name

    # 5. Create Resume DB record
    resume = Resume.objects.create(
        candidate=candidate,
        title=title,
        file_name=uploaded_file.name,
        file_url=f"/api/v1/candidate/resumes/placeholder/download/",  # updated after id assignment
        file_path=rel_path,
        file_type=uploaded_file.content_type or "application/octet-stream",
        file_size=uploaded_file.size,
        is_default=is_default,
    )
    resume.file_url = f"/api/v1/candidate/resumes/{resume.id}/download/"
    resume.save(update_fields=["file_url"])

    # 6. Run ATS analysis immediately
    run_ats_analysis(resume)

    return resume


def run_ats_analysis(resume: Resume) -> ResumeAnalysis:
    """Runs ATS parsing and scoring on the specified resume."""
    full_path = os.path.join(str(settings.BASE_DIR), resume.file_path)
    text = extract_text_from_file(full_path, resume.file_type)

    analysis_data = analyze_resume_content(text)

    analysis_obj, _ = ResumeAnalysis.objects.update_or_create(
        resume=resume,
        defaults={
            "ats_score": analysis_data["ats_score"],
            "extracted_text": text[:15000] if text else "",
            "strengths": analysis_data["strengths"],
            "weaknesses": analysis_data["weaknesses"],
            "missing_keywords": analysis_data["missing_keywords"],
            "matched_keywords": analysis_data["matched_keywords"],
            "analysis_result": analysis_data["analysis_result"],
            "model_version": "ats-engine-v1",
            "analyzed_at": timezone.now(),
        },
    )
    return analysis_obj


@transaction.atomic
def set_default_resume(candidate: CandidateProfile, resume_id: int) -> Resume:
    """Sets the designated resume as the default/primary one."""
    resume = candidate.resumes.get(id=resume_id, archived_at__isnull=True)
    candidate.resumes.filter(is_default=True).update(is_default=False)
    resume.is_default = True
    resume.save(update_fields=["is_default", "updated_at"])
    return resume


@transaction.atomic
def archive_resume(candidate: CandidateProfile, resume_id: int) -> Resume:
    """Soft-archives a resume. If it was primary, sets another active resume as primary."""
    resume = candidate.resumes.get(id=resume_id)
    was_default = resume.is_default
    resume.is_default = False
    resume.archived_at = timezone.now()
    resume.save(update_fields=["is_default", "archived_at", "updated_at"])

    if was_default:
        next_active = candidate.resumes.filter(archived_at__isnull=True).order_by("-uploaded_at").first()
        if next_active:
            next_active.is_default = True
            next_active.save(update_fields=["is_default", "updated_at"])

    return resume


@transaction.atomic
def unarchive_resume(candidate: CandidateProfile, resume_id: int) -> Resume:
    """Restores an archived resume. If there are no other active resumes, designates it as primary."""
    resume = candidate.resumes.get(id=resume_id)
    resume.archived_at = None
    has_active_default = candidate.resumes.filter(archived_at__isnull=True, is_default=True).exists()
    if not has_active_default:
        resume.is_default = True
    resume.save(update_fields=["is_default", "archived_at", "updated_at"])
    return resume


def get_resume_for_download(user, resume_id: int) -> Tuple[str, str, str]:
    """Checks permissions and returns (full_path, file_name, file_type)."""
    try:
        resume = Resume.objects.select_related("candidate__user").get(id=resume_id)
    except Resume.DoesNotExist:
        raise ValidationError("Resume not found.")

    # Authorization logic:
    # 1. Super admin can download any resume
    # 2. Candidate who owns it can download
    # 3. Recruiter can download if authenticated
    is_owner = hasattr(user, "id") and user.id == resume.candidate.user_id
    is_recruiter = getattr(user, "role", "") == "recruiter"
    is_admin = getattr(user, "role", "") == "super_admin"

    if not (is_owner or is_recruiter or is_admin):
        raise PermissionDenied("You do not have permission to view or download this resume.")

    full_path = os.path.join(str(settings.BASE_DIR), resume.file_path)
    if not os.path.exists(full_path):
        raise ValidationError("Resume file is not available on disk.")

    return full_path, resume.file_name, resume.file_type
