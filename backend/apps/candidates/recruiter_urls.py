from django.urls import path

from apps.candidates.views import RecruiterCandidateSearchView

urlpatterns = [
    path("candidates/", RecruiterCandidateSearchView.as_view(), name="recruiter-candidates-search"),
]

