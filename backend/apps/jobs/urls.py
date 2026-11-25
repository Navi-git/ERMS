"""Public Job endpoints."""
from django.urls import path
from apps.jobs.candidate_views import JobReportView
from apps.jobs.public_views import CompanyJobsListView, PublicJobDetailView, PublicJobListView
from apps.applications.views import JobApplyView

urlpatterns = [
    path("", PublicJobListView.as_view(), name="public-job-list"),
    path("<int:id>/", PublicJobDetailView.as_view(), name="public-job-detail"),
    path("<int:id>/apply/", JobApplyView.as_view(), name="public-job-apply"),
    path("<int:id>/report/", JobReportView.as_view(), name="public-job-report"),
    path("companies/<int:id>/jobs/", CompanyJobsListView.as_view(), name="company-jobs-list"),
]

