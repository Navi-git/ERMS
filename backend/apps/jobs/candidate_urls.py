"""Candidate Saved Jobs endpoints."""
from django.urls import path
from apps.jobs.candidate_views import CandidateSavedJobsView, CandidateToggleSavedJobView

urlpatterns = [
    path("", CandidateSavedJobsView.as_view(), name="candidate-saved-jobs"),
    path("<int:job_id>/", CandidateToggleSavedJobView.as_view(), name="candidate-toggle-saved-job"),
]

