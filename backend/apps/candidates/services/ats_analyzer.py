"""ATS (Applicant Tracking System) Resume Analyzer Engine.

Extracts text from PDF/DOCX files, parses key resume sections, analyzes keyword density
against master data skills, measures action verbs and quantifiable results, and produces
a comprehensive ATS score (0-100) with strengths, weaknesses, and actionable suggestions.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Set, Tuple

logger = logging.getLogger(__name__)

ACTION_VERBS = {
    "accelerated", "accomplished", "achieved", "acquired", "adapted", "administered",
    "advanced", "analyzed", "architected", "automated", "built", "centralized",
    "collaborated", "constructed", "coordinated", "created", "decreased", "delivered",
    "deployed", "designed", "developed", "devised", "directed", "documented", "drove",
    "engineered", "enhanced", "established", "executed", "expanded", "expedited",
    "facilitated", "formulated", "founded", "generated", "guided", "implemented",
    "improved", "increased", "initiated", "innovated", "inspected", "integrated",
    "introduced", "invented", "launched", "lead", "led", "leveraged", "managed",
    "maximized", "mentored", "migrated", "minimized", "modernized", "negotiated",
    "optimized", "orchestrated", "organized", "overhauled", "oversaw", "performed",
    "pioneered", "planned", "produced", "programmed", "promoted", "rebuilt", "reduced",
    "refactored", "refined", "reorganized", "resolved", "restructured", "revamped",
    "scaled", "simplified", "spearheaded", "standardized", "streamlined", "strengthened",
    "structured", "supervised", "surpassed", "trained", "transformed", "upgraded", "validated"
}

POPULAR_CORE_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Django", "SQL",
    "PostgreSQL", "Docker", "Kubernetes", "AWS", "Git", "REST APIs", "GraphQL",
    "CI/CD", "Agile", "HTML", "CSS", "Tailwind CSS", "Linux", "Microservices"
]


def extract_text_from_file(file_path: str, file_type: str = "") -> str:
    """Extracts raw text from PDF or DOCX file."""
    if not os.path.exists(file_path):
        logger.warning("File not found at %s", file_path)
        return ""

    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    try:
        if ext == ".pdf" or "pdf" in file_type.lower():
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pages_text = []
                for page in reader.pages:
                    page_str = page.extract_text()
                    if page_str:
                        pages_text.append(page_str)
                text = "\n".join(pages_text)
            except Exception as pdf_err:
                logger.warning("pypdf extraction failed (%s), attempting text fallback", pdf_err)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

        elif ext in [".docx", ".doc"] or "wordprocessingml" in file_type.lower():
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text:
                            paragraphs.append(cell.text)
            text = "\n".join(paragraphs)

        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

    except Exception as exc:
        logger.error("Failed to extract text from file %s: %s", file_path, exc)
        return ""

    return text.strip()


def detect_sections(text: str) -> Dict[str, bool]:
    """Detect presence of key resume sections."""
    lower = text.lower()
    sections = {
        "contact_info": bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text) or re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)),
        "summary": bool(re.search(r"\b(summary|professional summary|executive summary|profile|about me|objective)\b", lower)),
        "experience": bool(re.search(r"\b(experience|work experience|employment history|work history|professional experience)\b", lower)),
        "education": bool(re.search(r"\b(education|academic background|qualifications|academic history)\b", lower)),
        "skills": bool(re.search(r"\b(skills|technical skills|core competencies|technologies|proficiencies|tools)\b", lower)),
        "projects": bool(re.search(r"\b(projects|key projects|personal projects|portfolio)\b", lower)),
    }
    return sections


def find_matched_and_missing_skills(text: str) -> Tuple[List[str], List[str]]:
    """Compares text against MasterData skills and popular core skills."""
    lower_text = f" {text.lower()} "
    matched_skills: Set[str] = set()

    # Query master data items if available
    try:
        from apps.master_data.models import MasterDataItem
        candidate_catalog_skills = list(
            MasterDataItem.objects.filter(category="skill", is_active=True).values_list("value", flat=True)
        )
    except Exception:
        candidate_catalog_skills = []

    skills_to_check = set(candidate_catalog_skills).union(POPULAR_CORE_SKILLS)

    for skill in skills_to_check:
        clean_skill = skill.strip()
        if not clean_skill:
            continue
        pattern = r"(?<!\w)" + re.escape(clean_skill.lower()) + r"(?!\w)"
        if re.search(pattern, lower_text):
            matched_skills.add(clean_skill)

    # Missing suggestions: pick top skills that aren't in matched_skills
    missing_skills = [s for s in POPULAR_CORE_SKILLS if s not in matched_skills][:6]

    return sorted(list(matched_skills)), missing_skills


def count_action_verbs_and_metrics(text: str) -> Tuple[int, int]:
    """Counts action verbs and quantifiable metrics/numbers."""
    lower_tokens = set(re.findall(r"\b[a-z]{3,}\b", text.lower()))
    verb_count = len(lower_tokens.intersection(ACTION_VERBS))

    # Metrics regex: percentages, dollar values, large numbers with indicators
    metric_matches = re.findall(
        r"(\b\d+(\.\d+)?%\b|\$\s*\d+[\d,]*|\b\d+\s*(users|clients|projects|ms|seconds|x|million|k|team members)\b|\b\d+[\d,]*\b)",
        text,
        re.IGNORECASE
    )
    metric_count = min(len(metric_matches), 25)

    return verb_count, metric_count


def analyze_resume_content(text: str) -> Dict[str, Any]:
    """Computes ATS score (0-100), category breakdowns, strengths, weaknesses, and recommendations."""
    if not text or len(text.strip()) < 50:
        return {
            "ats_score": 25,
            "strengths": ["Document uploaded successfully."],
            "weaknesses": [
                "Unable to extract sufficient readable text from the document.",
                "Ensure your resume is text-based and not a scanned image.",
            ],
            "missing_keywords": POPULAR_CORE_SKILLS[:5],
            "matched_keywords": [],
            "analysis_result": {
                "word_count": len(text.split()) if text else 0,
                "section_scores": {
                    "structure": 10,
                    "skills": 5,
                    "impact": 5,
                    "readability": 5,
                },
                "recommendations": [
                    "Upload a clean PDF or DOCX generated from a text editor.",
                    "Avoid image-only or rasterized scans.",
                ],
            },
        }

    words = text.split()
    word_count = len(words)
    sections = detect_sections(text)
    matched_skills, missing_skills = find_matched_and_missing_skills(text)
    action_verb_count, metric_count = count_action_verbs_and_metrics(text)

    # 1. Structure score (max 30)
    structure_score = 0
    if sections.get("contact_info"):
        structure_score += 6
    if sections.get("summary"):
        structure_score += 5
    if sections.get("experience"):
        structure_score += 9
    if sections.get("education"):
        structure_score += 5
    if sections.get("skills"):
        structure_score += 5

    # 2. Skills & Keywords score (max 35)
    matched_count = len(matched_skills)
    if matched_count >= 12:
        skills_score = 35
    elif matched_count >= 8:
        skills_score = 30
    elif matched_count >= 5:
        skills_score = 22
    elif matched_count >= 2:
        skills_score = 14
    else:
        skills_score = 6

    # 3. Impact & Action Verbs score (max 20)
    impact_score = 0
    if action_verb_count >= 8:
        impact_score += 12
    elif action_verb_count >= 4:
        impact_score += 8
    elif action_verb_count >= 1:
        impact_score += 4

    if metric_count >= 5:
        impact_score += 8
    elif metric_count >= 2:
        impact_score += 5
    elif metric_count >= 1:
        impact_score += 2

    # 4. Readability & Length score (max 15)
    readability_score = 0
    if 250 <= word_count <= 1100:
        readability_score = 15
    elif 150 <= word_count < 250 or 1100 < word_count <= 1600:
        readability_score = 10
    else:
        readability_score = 5

    raw_total = structure_score + skills_score + impact_score + readability_score
    ats_score = max(20, min(100, raw_total))

    # Compile Strengths
    strengths: List[str] = []
    if sections.get("experience") and sections.get("education") and sections.get("skills"):
        strengths.append("Contains core ATS sections: Experience, Education, and Skills.")
    if matched_count >= 6:
        strengths.append(f"Strong keyword density: {matched_count} recognized skills detected.")
    if action_verb_count >= 5:
        strengths.append(f"Active voice used effectively ({action_verb_count} strong action verbs found).")
    if metric_count >= 3:
        strengths.append("Demonstrates quantifiable achievements and measurable business impact.")
    if 300 <= word_count <= 1000:
        strengths.append("Optimal document length and word density for applicant tracking software.")

    if not strengths:
        strengths.append("Clear typography and extractable text.")

    # Compile Weaknesses
    weaknesses: List[str] = []
    if not sections.get("summary"):
        weaknesses.append("Missing a dedicated Professional Summary or Profile section at the top.")
    if not sections.get("skills"):
        weaknesses.append("No distinct 'Skills' section heading detected; ATS parsers prefer a separate section.")
    if metric_count < 2:
        weaknesses.append("Low measurable data points; quantify results with %, numbers, or dollar values.")
    if matched_count < 5:
        weaknesses.append("Limited technical keywords found; consider adding more domain-specific technologies.")
    if action_verb_count < 3:
        weaknesses.append("Passive wording detected; begin bullet points with strong action verbs.")
    if word_count < 250:
        weaknesses.append("Resume may be too brief (< 250 words) to highlight all your qualifications.")
    elif word_count > 1200:
        weaknesses.append("Resume is lengthy (> 1200 words); concise 1-2 page resumes rank higher.")

    # Recommendations
    recommendations: List[str] = []
    if missing_skills:
        recommendations.append(f"Consider including key skills if applicable: {', '.join(missing_skills[:4])}.")
    if metric_count < 3:
        recommendations.append("Enhance bullet points using the formula: Action Verb + Task + Measurable Metric.")
    if not sections.get("summary"):
        recommendations.append("Add a 2-3 sentence Professional Summary highlighting your years of experience and core strengths.")
    recommendations.append("Ensure section titles use standard headings (Experience, Education, Skills, Projects).")

    return {
        "ats_score": ats_score,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_keywords": missing_skills,
        "matched_keywords": matched_skills,
        "analysis_result": {
            "word_count": word_count,
            "action_verb_count": action_verb_count,
            "metric_count": metric_count,
            "sections_detected": sections,
            "section_scores": {
                "structure": structure_score,
                "skills": skills_score,
                "impact": impact_score,
                "readability": readability_score,
            },
            "recommendations": recommendations,
        },
    }
