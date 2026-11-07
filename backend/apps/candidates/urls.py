from django.urls import path

from apps.candidates.views import (
    CandidateEducationDetailView,
    CandidateEducationListCreateView,
    CandidateExperienceDetailView,
    CandidateExperienceListCreateView,
    CandidateProfileView,
    CandidateResumeAnalyzeView,
    CandidateResumeArchiveView,
    CandidateResumeDetailView,
    CandidateResumeDownloadView,
    CandidateResumeListCreateView,
    CandidateResumeSetDefaultView,
    CandidateResumeUnarchiveView,
    CandidateSkillDetailView,
    CandidateSkillsView,
)

urlpatterns = [
    # Profile & Completeness
    path("profile/", CandidateProfileView.as_view(), name="candidate-profile"),
    # Education
    path("education/", CandidateEducationListCreateView.as_view(), name="candidate-education-list-create"),
    path("education/<int:pk>/", CandidateEducationDetailView.as_view(), name="candidate-education-detail"),
    # Experience
    path("experience/", CandidateExperienceListCreateView.as_view(), name="candidate-experience-list-create"),
    path("experience/<int:pk>/", CandidateExperienceDetailView.as_view(), name="candidate-experience-detail"),
    # Skills
    path("skills/", CandidateSkillsView.as_view(), name="candidate-skills-list-create"),
    path("skills/<int:pk>/", CandidateSkillDetailView.as_view(), name="candidate-skill-detail"),
    # Resumes & ATS Analysis
    path("resumes/", CandidateResumeListCreateView.as_view(), name="candidate-resume-list-create"),
    path("resumes/<int:pk>/", CandidateResumeDetailView.as_view(), name="candidate-resume-detail"),
    path("resumes/<int:pk>/set-default/", CandidateResumeSetDefaultView.as_view(), name="candidate-resume-set-default"),
    path("resumes/<int:pk>/archive/", CandidateResumeArchiveView.as_view(), name="candidate-resume-archive"),
    path("resumes/<int:pk>/unarchive/", CandidateResumeUnarchiveView.as_view(), name="candidate-resume-unarchive"),
    path("resumes/<int:pk>/analyze/", CandidateResumeAnalyzeView.as_view(), name="candidate-resume-analyze"),
    path("resumes/<int:pk>/download/", CandidateResumeDownloadView.as_view(), name="candidate-resume-download"),
]
