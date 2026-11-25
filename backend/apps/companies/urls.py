from django.urls import path
from .views import (
    PublicCompanyListView,
    PublicCompanyDetailView,
    CandidateCompanyReviewCreateView,
)

urlpatterns = [
    # Public company browsing and details
    path("", PublicCompanyListView.as_view(), name="public-company-list"),
    path("<int:pk>/", PublicCompanyDetailView.as_view(), name="public-company-detail"),
    path("<int:pk>/reviews/", CandidateCompanyReviewCreateView.as_view(), name="candidate-company-review-create"),
]

