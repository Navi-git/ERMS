from django.urls import path
from . import recruiter_views

urlpatterns = [
    path("<int:pk>/offer/", recruiter_views.RecruiterApplicationOfferView.as_view(), name="recruiter-application-offer"),
    path("<int:pk>/offers/", recruiter_views.RecruiterOfferCreateOrUpdateView.as_view(), name="recruiter-application-offer-create"),
    path("<int:pk>/offers/preview-letter/", recruiter_views.RecruiterOfferPreviewLetterView.as_view(), name="recruiter-application-offer-preview"),
]
