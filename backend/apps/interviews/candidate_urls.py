from django.urls import path
from .views import (
    CandidateInterviewListView,
    CandidateInterviewDetailView,
    CandidateInterviewRespondView,
    CandidateRequestRescheduleView,
)

app_name = "candidate_interviews"

urlpatterns = [
    path("", CandidateInterviewListView.as_view(), name="list"),
    path("<int:pk>/", CandidateInterviewDetailView.as_view(), name="detail"),
    path("<int:pk>/respond/", CandidateInterviewRespondView.as_view(), name="respond"),
    path("<int:pk>/request-reschedule/", CandidateRequestRescheduleView.as_view(), name="request_reschedule"),
]
