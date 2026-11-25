"""Recruiter Job endpoints."""
from django.urls import path
from apps.jobs.recruiter_views import (
    RecruiterJobBenefitsView,
    RecruiterJobCloseView,
    RecruiterJobDetailView,
    RecruiterJobHoldView,
    RecruiterJobListCreateView,
    RecruiterJobMarkFilledView,
    RecruiterJobOverviewView,
    RecruiterJobPublishView,
    RecruiterJobResumeView,
    RecruiterJobSkillsView,
    RecruiterJobStageDetailView,
    RecruiterJobStagesListView,
    RecruiterJobStagesReorderView,
)
from apps.applications.views import RecruiterJobApplicantsView

urlpatterns = [
    path("", RecruiterJobListCreateView.as_view(), name="recruiter-job-list-create"),
    path("<int:id>/", RecruiterJobDetailView.as_view(), name="recruiter-job-detail"),
    path("<int:job_id>/applications/", RecruiterJobApplicantsView.as_view(), name="recruiter-job-applications"),
    path("<int:id>/publish/", RecruiterJobPublishView.as_view(), name="recruiter-job-publish"),
    path("<int:id>/hold/", RecruiterJobHoldView.as_view(), name="recruiter-job-hold"),
    path("<int:id>/resume/", RecruiterJobResumeView.as_view(), name="recruiter-job-resume"),
    path("<int:id>/close/", RecruiterJobCloseView.as_view(), name="recruiter-job-close"),
    path("<int:id>/mark-filled/", RecruiterJobMarkFilledView.as_view(), name="recruiter-job-mark-filled"),
    path("<int:id>/overview/", RecruiterJobOverviewView.as_view(), name="recruiter-job-overview"),
    path("<int:id>/skills/", RecruiterJobSkillsView.as_view(), name="recruiter-job-skills"),
    path("<int:id>/benefits/", RecruiterJobBenefitsView.as_view(), name="recruiter-job-benefits"),
    path("<int:id>/stages/", RecruiterJobStagesListView.as_view(), name="recruiter-job-stages"),
    path("<int:id>/stages/<int:sid>/", RecruiterJobStageDetailView.as_view(), name="recruiter-job-stage-detail"),
    path("<int:id>/stages/reorder/", RecruiterJobStagesReorderView.as_view(), name="recruiter-job-stages-reorder"),
]

