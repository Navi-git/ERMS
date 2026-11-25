from django.urls import path
from .recruiter_views import (
    RecruiterCompanyProfileView,
    RecruiterCompanyLogoUploadView,
    RecruiterCompanyCoverUploadView,
    RecruiterCompanyBenefitsView,
    RecruiterCompanyBenefitDetailView,
)
from .verification_views import (
    RecruiterVerificationStatusView,
    RecruiterVerificationDocumentUploadView,
    RecruiterVerificationDocumentDownloadView,
    RecruiterVerificationDraftView,
    RecruiterVerificationSubmitView,
)

urlpatterns = [
    # Recruiter company profile & branding
    path("", RecruiterCompanyProfileView.as_view(), name="recruiter-company-profile"),
    path("logo/", RecruiterCompanyLogoUploadView.as_view(), name="recruiter-company-logo"),
    path("cover/", RecruiterCompanyCoverUploadView.as_view(), name="recruiter-company-cover"),

    # Recruiter company benefits CRUD
    path("benefits/", RecruiterCompanyBenefitsView.as_view(), name="recruiter-company-benefits"),
    path("benefits/<int:pk>/", RecruiterCompanyBenefitDetailView.as_view(), name="recruiter-company-benefit-detail"),

    # Recruiter verification workflow (Figma Page 8)
    path("verification/", RecruiterVerificationStatusView.as_view(), name="recruiter-verification-status"),
    path("verification/documents/", RecruiterVerificationDocumentUploadView.as_view(), name="recruiter-verification-doc-upload"),
    path("verification/documents/<int:pk>/download/", RecruiterVerificationDocumentDownloadView.as_view(), name="recruiter-verification-doc-download"),
    path("verification/save-draft/", RecruiterVerificationDraftView.as_view(), name="recruiter-verification-save-draft"),
    path("verification/submit/", RecruiterVerificationSubmitView.as_view(), name="recruiter-verification-submit"),
]
