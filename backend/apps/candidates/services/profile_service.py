"""Service layer for Candidate Profile, Education, Experience, and Skills."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.utils import timezone

from apps.candidates.models import (
    CandidateProfile,
    CandidateSkill,
    Education,
    Experience,
    ProficiencyLevel,
    Resume,
    SeekingStatus,
)
from apps.master_data.models import MasterDataItem, SkillAliasRelation

def get_or_create_profile(user) -> CandidateProfile:
    
    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    return profile


def calculate_completeness(profile: CandidateProfile) -> Dict[str, Any]:

    score = 0.0
    breakdown = {}
    missing_sections = []

    # 1. Headline & Summary (15%)
    headline_points = 7.5 if (profile.headline and profile.headline.strip()) else 0.0
    summary_points = 7.5 if (profile.summary and profile.summary.strip()) else 0.0
    bio_score = headline_points + summary_points
    score += bio_score
    breakdown["bio"] = {
        "earned": round(bio_score, 1),
        "total": 15,
        "completed": bio_score == 15,
    }
    if not profile.headline:
        missing_sections.append("Add a professional headline")
    if not profile.summary:
        missing_sections.append("Add a summary about yourself")

    # 2. Location & Seeking Status (10%)
    loc_points = 5.0 if (profile.current_location and profile.current_location.strip()) else 0.0
    seeking_points = 5.0 if profile.seeking_status else 0.0
    pref_score = loc_points + seeking_points
    score += pref_score
    breakdown["preferences"] = {
        "earned": round(pref_score, 1),
        "total": 10,
        "completed": pref_score == 10,
    }
    if not profile.current_location:
        missing_sections.append("Specify your current location")

    # 3. Work Experience (25%)
    exp_count = profile.experiences.count()
    exp_points = 25.0 if exp_count >= 1 else 0.0
    score += exp_points
    breakdown["experience"] = {
        "earned": exp_points,
        "total": 25,
        "completed": exp_count >= 1,
        "count": exp_count,
    }
    if exp_count == 0:
        missing_sections.append("Add at least one work experience")

    # 4. Education (15%)
    edu_count = profile.educations.count()
    edu_points = 15.0 if edu_count >= 1 else 0.0
    score += edu_points
    breakdown["education"] = {
        "earned": edu_points,
        "total": 15,
        "completed": edu_count >= 1,
        "count": edu_count,
    }
    if edu_count == 0:
        missing_sections.append("Add your educational background")

    # 5. Skills (20% - up to 3 skills, ~6.67% each)
    skill_count = profile.skills.count()
    skill_points = min(20.0, round(skill_count * (20.0 / 3.0), 1))
    score += skill_points
    breakdown["skills"] = {
        "earned": round(skill_points, 1),
        "total": 20,
        "completed": skill_count >= 3,
        "count": skill_count,
    }
    if skill_count < 3:
        missing_sections.append(f"Add at least {max(0, 3 - skill_count)} more skill(s)")

    # 6. Default Resume (15%)
    has_default_resume = profile.resumes.filter(is_default=True, archived_at__isnull=True).exists()
    resume_points = 15.0 if has_default_resume else 0.0
    score += resume_points
    breakdown["resume"] = {
        "earned": resume_points,
        "total": 15,
        "completed": has_default_resume,
    }
    if not has_default_resume:
        missing_sections.append("Upload a primary resume")

    percentage = int(min(100, round(score)))
    return {
        "percentage": percentage,
        "breakdown": breakdown,
        "missing_sections": missing_sections,
    }


def update_profile(profile: CandidateProfile, data: Dict[str, Any]) -> CandidateProfile:
    """Updates candidate profile fields."""
    updatable_fields = [
        "headline", "summary", "current_location", "seeking_status",
        "expected_salary_min", "expected_salary_max", "currency",
        "work_authorization_status", "security_clearance", "willing_to_relocate",
        "linkedin_url", "github_url", "portfolio_url",
    ]
    for field in updatable_fields:
        if field in data:
            setattr(profile, field, data[field])
    profile.save()
    return profile


# ---------------- Education CRUD ---------------- #

def list_education(profile: CandidateProfile):
    return profile.educations.all()


def create_education(profile: CandidateProfile, data: Dict[str, Any]) -> Education:
    return Education.objects.create(candidate=profile, **data)


def update_education(profile: CandidateProfile, education_id: int, data: Dict[str, Any]) -> Education:
    edu = profile.educations.get(id=education_id)
    for k, v in data.items():
        setattr(edu, k, v)
    edu.save()
    return edu


def delete_education(profile: CandidateProfile, education_id: int) -> bool:
    count, _ = profile.educations.filter(id=education_id).delete()
    return count > 0


# ---------------- Experience CRUD ---------------- #

def list_experience(profile: CandidateProfile):
    return profile.experiences.all()


def create_experience(profile: CandidateProfile, data: Dict[str, Any]) -> Experience:
    return Experience.objects.create(candidate=profile, **data)


def update_experience(profile: CandidateProfile, experience_id: int, data: Dict[str, Any]) -> Experience:
    exp = profile.experiences.get(id=experience_id)
    for k, v in data.items():
        setattr(exp, k, v)
    exp.save()
    return exp


def delete_experience(profile: CandidateProfile, experience_id: int) -> bool:
    count, _ = profile.experiences.filter(id=experience_id).delete()
    return count > 0


# ---------------- Skills CRUD & Alias Resolution ---------------- #

def resolve_skill_alias(skill_id: Optional[int] = None, text_name: Optional[str] = None):
    """Resolves a skill or alias to a canonical MasterDataItem if configured."""
    # Check text alias
    if text_name:
        alias_rel = SkillAliasRelation.objects.filter(alias_text__iexact=text_name.strip()).first()
        if alias_rel:
            return alias_rel.target_skill

    # Check source skill relation
    if skill_id:
        alias_rel = SkillAliasRelation.objects.filter(source_skill_id=skill_id).first()
        if alias_rel:
            return alias_rel.target_skill
        return MasterDataItem.objects.filter(id=skill_id, category="skill").first()

    return None


@transaction.atomic
def add_or_update_candidate_skill(
    profile: CandidateProfile,
    skill_id: Optional[int] = None,
    custom_skill_name: Optional[str] = None,
    proficiency_level: str = ProficiencyLevel.INTERMEDIATE,
    years_of_experience: Optional[Decimal] = None,
) -> CandidateSkill:
    """Adds or updates a candidate skill, with automatic alias resolution."""
    resolved_skill = resolve_skill_alias(skill_id=skill_id, text_name=custom_skill_name)

    if resolved_skill:
        # Canonical skill matched
        skill_obj, _ = CandidateSkill.objects.update_or_create(
            candidate=profile,
            skill=resolved_skill,
            defaults={
                "proficiency_level": proficiency_level,
                "years_of_experience": years_of_experience,
                "custom_skill_name": None,
            },
        )
        return skill_obj
    elif custom_skill_name and custom_skill_name.strip():
        # Custom "Other" skill
        clean_custom = custom_skill_name.strip()
        skill_obj, _ = CandidateSkill.objects.update_or_create(
            candidate=profile,
            custom_skill_name=clean_custom,
            defaults={
                "skill": None,
                "proficiency_level": proficiency_level,
                "years_of_experience": years_of_experience,
            },
        )
        return skill_obj
    else:
        raise ValueError("Either a valid skill_id or custom_skill_name must be provided.")


def delete_candidate_skill(profile: CandidateProfile, skill_item_id: int) -> bool:
    count, _ = profile.skills.filter(id=skill_item_id).delete()
    return count > 0

