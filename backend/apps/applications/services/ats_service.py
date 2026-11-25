import re
from typing import Dict, Any, List


class AtsMatchService:
    """Calculates on-the-fly candidate & resume match percentage against job requisitions.

    Strictly recruiter-facing for screening and candidate pipeline evaluation.
    Never persisted directly in database column per architectural decisions.
    """

    @classmethod
    def calculate_match(cls, application) -> Dict[str, Any]:
        """Calculates ATS match metrics for an application instance."""
        return cls.calculate_match_score(
            job=application.job,
            resume=application.resume,
            candidate=application.candidate,
        )

    @classmethod
    def calculate_match_score(cls, job, resume, candidate) -> Dict[str, Any]:
        """Calculates ATS match metrics given job, resume, and candidate instances."""
        if not job:
            return {
                "match_percentage": 75,
                "matched_skills": [],
                "missing_skills": [],
                "match_label": cls._get_match_label(75),
                "semantic_analysis": "Baseline alignment.",
            }

        job_skills_qs = job.skills.select_related("skill").all() if hasattr(job, "skills") else []
        has_skills = job_skills_qs.exists() if hasattr(job_skills_qs, "exists") else bool(job_skills_qs)

        if not has_skills:
            # If no specific job skills are tagged on the job requisition,
            # use resume's overall ATS score if available, or reasonable baseline.
            base_score = 75
            if resume:
                try:
                    analysis = getattr(resume, "analysis", None)
                    if analysis and analysis.ats_score:
                        base_score = analysis.ats_score
                except Exception:
                    pass
            return {
                "match_percentage": base_score,
                "matched_skills": [],
                "missing_skills": [],
                "match_label": cls._get_match_label(base_score),
                "semantic_analysis": "General alignment based on candidate profile and resume evaluation.",
            }

        # Collect required and optional job skills
        required_skills: List[str] = []
        preferred_skills: List[str] = []
        for js in job_skills_qs:
            skill_name = js.skill.value if getattr(js, "skill", None) else ""
            if skill_name:
                if getattr(js, "is_required", True):
                    required_skills.append(skill_name)
                else:
                    preferred_skills.append(skill_name)

        # Candidate skills from candidate_skills table
        candidate_skills_set = set()
        if candidate and hasattr(candidate, "skills"):
            for cs in candidate.skills.select_related("skill").all():
                if getattr(cs, "skill", None) and cs.skill.value:
                    candidate_skills_set.add(cs.skill.value.lower())

        # Also inspect resume text / analysis if available
        resume_text = ""
        if resume:
            try:
                analysis = getattr(resume, "analysis", None)
                if analysis and analysis.extracted_text:
                    resume_text = analysis.extracted_text.lower()
            except Exception:
                pass

        matched_skills: List[str] = []
        missing_skills: List[str] = []

        all_job_skills = required_skills + preferred_skills
        for skill in all_job_skills:
            skill_lower = skill.lower()
            # Matched if in candidate's skills or mentioned in resume text
            is_matched = skill_lower in candidate_skills_set
            if not is_matched and resume_text:
                # Word boundary match in extracted resume text
                pattern = r"\b" + re.escape(skill_lower) + r"\b"
                if re.search(pattern, resume_text):
                    is_matched = True

            if is_matched:
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)

        # Calculate weighted score: required skills count for 80%, preferred for 20%
        req_total = len(required_skills)
        pref_total = len(preferred_skills)

        req_matched = sum(1 for s in required_skills if s in matched_skills)
        pref_matched = sum(1 for s in preferred_skills if s in matched_skills)

        if req_total > 0 and pref_total > 0:
            score = int((req_matched / req_total * 80) + (pref_matched / pref_total * 20))
        elif req_total > 0:
            score = int(req_matched / req_total * 100)
        elif pref_total > 0:
            score = int(pref_matched / pref_total * 100)
        else:
            score = 75

        # Normalize within 0 - 100 range
        score = max(0, min(100, score))

        return {
            "match_percentage": score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "match_label": cls._get_match_label(score),
            "semantic_analysis": f"Evaluated against {len(all_job_skills)} target competencies and resume content.",
        }

    @staticmethod
    def _get_match_label(score: int) -> str:
        if score >= 85:
            return "Strong Match"
        if score >= 70:
            return "Good Match"
        if score >= 50:
            return "Moderate Match"
        return "Low Match"

