from django.urls import path
from . import recruiter_views

urlpatterns = [
    path("", recruiter_views.RecruiterOfferListView.as_view(), name="recruiter-offer-list"),
    path("<int:pk>/", recruiter_views.RecruiterOfferDetailView.as_view(), name="recruiter-offer-detail"),
    path("<int:pk>/send/", recruiter_views.RecruiterOfferSendView.as_view(), name="recruiter-offer-send"),
    path("<int:pk>/withdraw/", recruiter_views.RecruiterOfferWithdrawView.as_view(), name="recruiter-offer-withdraw"),
    path("<int:pk>/attachments/", recruiter_views.RecruiterOfferAttachmentUploadView.as_view(), name="recruiter-offer-attachment-upload"),
    path("attachments/<int:att_id>/", recruiter_views.RecruiterOfferAttachmentDeleteView.as_view(), name="recruiter-offer-attachment-delete"),
    path("templates/", recruiter_views.RecruiterOfferTemplateListCreateView.as_view(), name="recruiter-offer-template-list"),
    path("templates/<int:pk>/", recruiter_views.RecruiterOfferTemplateDetailView.as_view(), name="recruiter-offer-template-detail"),
]
