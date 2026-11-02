"""Service for Recruiter Candidate Discovery & Search with privacy masking."""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Dict, List, Optional

from django.db.models import Q, QuerySet

from apps.candidates.models import CandidateProfile, SeekingStatus


def mask_email(email: str) -> str:
    """Masks email address like j***@***.com."""
    if not email or "@" not in email:
        return "***@***.com"
    parts = email.split("@")
    user_part = parts[0]
    domain_part = parts[1]
    masked_user = user_part[0] + "***" if len(user_part) > 1 else "***"
    domain_parts = domain_part.split(".")
    masked_domain = "***." + domain_parts[-1] if len(domain_parts) > 1 else "***"
    return f"{masked_user}@{masked_domain}"


def mask_name(full_name: str) -> str:
    """Masks full name to First Name + Last Initial, e.g. 'Jane D.'."""
    parts = (full_name or "").strip().split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    if parts:
        return parts[0]
    return "Candidate"


def calculate_candidate_total_experience_years(profile: CandidateProfile) -> float:
    """Approximates total work experience years from candidate experiences."""
    total_days = 0
    today = date.today()
    for exp in profile.experiences.all():
        start = exp.start_date
        end = today if exp.is_current or not exp.end_date else exp.end_date
        if start and end and end >= start:
            total_days += (end - start).days
    return round(total_days / 365.25, 1)


def search_candidates_for_recruiter(
    q: Optional[str] = None,
    skills: Optional[str] = None,
    location: Optional[str] = None,
    experience_min: Optional[float] = None,
    experience_max: Optional[float] = None,
    seeking_status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Performs search over privacy-compliant candidates.

    Only candidates with `seeking_status` in ('actively_seeking', 'open_to_offers')
    are visible. Contact details are masked.
    """
    allowed_statuses = [SeekingStatus.ACTIVELY_SEEKING, SeekingStatus.OPEN_TO_OFFERS]
    if seeking_status and seeking_status in allowed_statuses:
        target_statuses = [seeking_status]
    else:
        target_statuses = allowed_statuses

    qs: QuerySet[CandidateProfile] = (
        CandidateProfile.objects.filter(
            seeking_status__in=target_statuses,
            user__is_active=True,
        )
        .select_related("user")
        .prefetch_related("skills__skill", "experiences", "educations", "resumes__analysis")
        .distinct()
    )

    # 1. Text search: keyword across headline, summary, and experience titles
    if q and q.strip():
        term = q.strip()
        qs = qs.filter(
            Q(headline__icontains=term)
            | Q(summary__icontains=term)
            | Q(experiences__job_title__icontains=term)
            | Q(experiences__company_name__icontains=term)
        ).distinct()

    # 2. Location filter
    if location and location.strip():
        loc_term = location.strip()
        qs = qs.filter(
            Q(current_location__icontains=loc_term)
            | (Q(willing_to_relocate=True) & Q(summary__icontains=loc_term))
        )

    # 3. Skills filter (comma-separated skill names or IDs)
    if skills and skills.strip():
        skill_terms = [s.strip().lower() for s in skills.split(",") if s.strip()]
        for st in skill_terms:
            qs = qs.filter(
                Q(skills__skill__value__icontains=st)
                | Q(skills__custom_skill_name__icontains=st)
            ).distinct()

    results = []
    for profile in qs:
        exp_years = calculate_candidate_total_experience_years(profile)
        if experience_min is not None and exp_years < experience_min:
            continue
        if experience_max is not None and exp_years > experience_max:
            continue

        # Get default resume ATS score if present
        default_resume = profile.resumes.filter(is_default=True, archived_at__isnull=True).first()
        ats_score = None
        if default_resume and hasattr(default_resume, "analysis"):
            ats_score = default_resume.analysis.ats_score

        # Prepare formatted candidate card with masked contacts
        skills_list = []
        for s in profile.skills.all():
            skill_name = s.skill.value if s.skill else s.custom_skill_name
            if skill_name:
                skills_list.append({
                    "name": skill_name,
                    "proficiency": s.proficiency_level,
                    "years": float(s.years_of_experience) if s.years_of_experience else None,
                })

        experience_list = []
        for exp in profile.experiences.all():
            experience_list.append({
                "job_title": exp.job_title,
                "company_name": exp.company_name,
                "employment_type": exp.employment_type,
                "start_date": exp.start_date.isoformat() if exp.start_date else None,
                "end_date": exp.end_date.isoformat() if exp.end_date else None,
                "is_current": exp.is_current,
                "location": exp.location,
            })

        user = profile.user
        results.append({
            "candidate_id": profile.id,
            "masked_name": mask_name(user.full_name),
            "masked_email": mask_email(user.email),
            "profile_picture_url": user.profile_picture_url,
            "headline": profile.headline or "",
            "summary": profile.summary or "",
            "current_location": profile.current_location or "",
            "seeking_status": profile.seeking_status,
            "years_of_experience": exp_years,
            "willing_to_relocate": profile.willing_to_relocate,
            "skills": skills_list,
            "experiences": experience_list,
            "ats_score": ats_score,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
        })

    return results
