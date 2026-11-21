from django.urls import path
from .views import (
    RecruiterInterviewListView,
    RecruiterInterviewMetricsView,
    RecruiterScheduleInterviewView,
    RecruiterInterviewDetailView,
    RecruiterRescheduleInterviewView,
    RecruiterCancelInterviewView,
    RecruiterInterviewOutcomeView,
    RecruiterScorecardView,
    RecruiterNudgePanelView,
)

app_name = "recruiter_interviews"

urlpatterns = [
    path("", RecruiterInterviewListView.as_view(), name="list"),
    path("metrics/", RecruiterInterviewMetricsView.as_view(), name="metrics"),
    path("schedule/", RecruiterScheduleInterviewView.as_view(), name="schedule"),
    path("<int:pk>/", RecruiterInterviewDetailView.as_view(), name="detail"),
    path("<int:pk>/reschedule/", RecruiterRescheduleInterviewView.as_view(), name="reschedule"),
    path("<int:pk>/cancel/", RecruiterCancelInterviewView.as_view(), name="cancel"),
    path("<int:pk>/outcome/", RecruiterInterviewOutcomeView.as_view(), name="outcome"),
    path("<int:pk>/scorecard/", RecruiterScorecardView.as_view(), name="scorecard"),
    path("participants/<int:pid>/nudge/", RecruiterNudgePanelView.as_view(), name="nudge_panelist"),
]
