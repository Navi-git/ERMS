from django.urls import path
from apps.applications.views import (
    CandidateApplicationListView,
    CandidateApplicationDetailView,
    CandidateApplicationWithdrawView,
    CandidateApplicationMaterialsView,
    CandidateApplicationMaterialDeleteView,
)

urlpatterns = [
    path("", CandidateApplicationListView.as_view(), name="candidate-applications-list"),
    path("<int:id>/", CandidateApplicationDetailView.as_view(), name="candidate-application-detail"),
    path("<int:id>/withdraw/", CandidateApplicationWithdrawView.as_view(), name="candidate-application-withdraw"),
    path("<int:id>/materials/", CandidateApplicationMaterialsView.as_view(), name="candidate-application-materials"),
    path(
        "<int:id>/materials/<int:mid>/",
        CandidateApplicationMaterialDeleteView.as_view(),
        name="candidate-application-material-delete",
    ),
]

