"""Admin Job endpoints."""
from django.urls import path
from apps.jobs.admin_views import (
    AdminJobDetailView,
    AdminJobFlagView,
    AdminJobListView,
    AdminJobNotesView,
    AdminJobStatusUpdateView,
)

urlpatterns = [
    path("", AdminJobListView.as_view(), name="admin-job-list"),
    path("<int:id>/", AdminJobDetailView.as_view(), name="admin-job-detail"),
    path("<int:id>/status/", AdminJobStatusUpdateView.as_view(), name="admin-job-status-update"),
    path("<int:id>/flag/", AdminJobFlagView.as_view(), name="admin-job-flag"),
    path("<int:id>/notes/", AdminJobNotesView.as_view(), name="admin-job-notes"),
]
