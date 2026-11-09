from django.urls import path
from .admin_views import (
    AdminCompanyQueueView,
    AdminCompanyDetailView,
    AdminCompanyStartReviewView,
    AdminCompanyApproveView,
    AdminCompanyRejectView,
    AdminCompanySaveNoteView,
)

urlpatterns = [
    path("companies/", AdminCompanyQueueView.as_view(), name="admin-companies-queue"),
    path("companies/<int:pk>/", AdminCompanyDetailView.as_view(), name="admin-company-detail"),
    path("companies/<int:pk>/start-review/", AdminCompanyStartReviewView.as_view(), name="admin-company-start-review"),
    path("companies/<int:pk>/approve/", AdminCompanyApproveView.as_view(), name="admin-company-approve"),
    path("companies/<int:pk>/reject/", AdminCompanyRejectView.as_view(), name="admin-company-reject"),
    path("companies/<int:pk>/notes/", AdminCompanySaveNoteView.as_view(), name="admin-company-notes"),
]

