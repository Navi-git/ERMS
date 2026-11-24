from django.urls import path
from . import candidate_views

urlpatterns = [
    path("<int:pk>/offer/", candidate_views.CandidateApplicationOfferView.as_view(), name="candidate-application-offer"),
]
