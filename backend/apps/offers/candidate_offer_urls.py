from django.urls import path
from . import candidate_views

urlpatterns = [
    path("decline-reasons/", candidate_views.CandidateDeclineReasonsView.as_view(), name="candidate-decline-reasons"),
    path("<int:pk>/accept/", candidate_views.CandidateOfferAcceptView.as_view(), name="candidate-offer-accept"),
    path("<int:pk>/decline/", candidate_views.CandidateOfferDeclineView.as_view(), name="candidate-offer-decline"),
    path("<int:pk>/download/", candidate_views.CandidateOfferDownloadView.as_view(), name="candidate-offer-download"),
]
