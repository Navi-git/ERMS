"""ERD tables for Company Module:
- companies
- company_benefits
- company_talent_tracks
- company_verifications
- company_verification_documents
- company_reviews
"""
from django.conf import settings
from django.db import models


class CompanyVerificationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class RiskLevel(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"


class VerificationDocumentType(models.TextChoices):
    INCORPORATION = "incorporation", "Certificate of Incorporation"
    TAX_FORM = "tax_form", "Tax Form (W-9 / Form 1099)"
    BUSINESS_LICENSE = "business_license", "Business License or Utility Statement"


class ReviewEligibilityReason(models.TextChoices):
    OFFER_RECEIVED = "OFFER_RECEIVED", "Offer Received"
    HIRED = "HIRED", "Hired"


class ReviewModerationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Moderation"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class Company(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)  # markdown

    registration_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    tax_id = models.CharField(max_length=100, null=True, blank=True)
    industry = models.ForeignKey(
        "master_data.MasterDataItem",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="companies",
    )
    email = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    company_size = models.CharField(max_length=50, null=True, blank=True)
    founded_year = models.IntegerField(null=True, blank=True)

    logo_url = models.CharField(max_length=500, null=True, blank=True)
    cover_image_url = models.CharField(max_length=500, null=True, blank=True)
    website_url = models.CharField(max_length=500, null=True, blank=True)

    headquarters_address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    postal_code = models.CharField(max_length=20, null=True, blank=True)

    media = models.JSONField(null=True, blank=True)
    billing_name = models.CharField(max_length=255, null=True, blank=True)
    billing_email = models.CharField(max_length=255, null=True, blank=True)
    billing_address = models.CharField(max_length=250, null=True, blank=True)

    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="administered_companies",
    )
    verification_status = models.CharField(
        max_length=30,
        choices=CompanyVerificationStatus.choices,
        default=CompanyVerificationStatus.PENDING,
    )
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        db_column="suspended_by",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "companies"
        indexes = [
            models.Index(fields=["verification_status"], name="companies_verif_status_idx"),
            models.Index(fields=["created_at"], name="companies_created_at_idx"),
        ]

    def __str__(self):
        return self.name


class CompanyBenefit(models.Model):
    """Perks and benefits offered by the company (e.g. Remote-First, Health, PTO)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="benefits")
    name = models.CharField(max_length=100)
    custom_description = models.TextField(null=True, blank=True)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "company_benefits"
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class CompanyTalentTrack(models.Model):
    """Primary Functional Talent Tracks (e.g. Software Engineering, Cloud DevOps)."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="talent_tracks")
    master_data_item = models.ForeignKey(
        "master_data.MasterDataItem",
        on_delete=models.CASCADE,
        related_name="company_talent_tracks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "company_talent_tracks"
        unique_together = ("company", "master_data_item")

    def __str__(self):
        return f"{self.company.name} - {self.master_data_item.value}"


class CompanyVerification(models.Model):
    """Verification application submitted by the recruiter and audited by Super Admin."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="verifications")
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_company_verifications",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_company_verifications",
    )
    designated_recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    status = models.CharField(
        max_length=30,
        choices=CompanyVerificationStatus.choices,
        default=CompanyVerificationStatus.PENDING,
    )
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        null=True,
        blank=True,
    )
    intended_hiring_min = models.IntegerField(null=True, blank=True)
    intended_hiring_max = models.IntegerField(null=True, blank=True)

    review_history = models.JSONField(default=list, blank=True)
    internal_notes = models.TextField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "company_verifications"
        indexes = [
            models.Index(fields=["status"], name="comp_verif_status_idx"),
            models.Index(fields=["submitted_at"], name="comp_verif_submitted_at_idx"),
        ]

    def __str__(self):
        return f"{self.company.name} Verification ({self.status})"


class CompanyVerificationDocument(models.Model):
    """Individual legal compliance documents with SHA-256 integrity and revision tracking."""
    verification = models.ForeignKey(CompanyVerification, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=50, choices=VerificationDocumentType.choices)
    file_url = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(null=True, blank=True)
    checksum_sha256 = models.CharField(max_length=64, null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=CompanyVerificationStatus.choices,
        default=CompanyVerificationStatus.PENDING,
    )
    is_current = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "company_verification_documents"
        indexes = [
            models.Index(fields=["verification", "is_current"], name="comp_verif_doc_current_idx"),
        ]

    def __str__(self):
        return f"{self.verification.company.name} - {self.document_type} ({self.original_filename})"


class CompanyReview(models.Model):
    """Candidate rating and review of a company, gated on receiving an offer or being hired."""
    candidate = models.ForeignKey(
        "candidates.CandidateProfile",
        on_delete=models.CASCADE,
        related_name="company_reviews",
    )
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="reviews")
    # Will point to applications.Application ForeignKey once applications module is implemented
    application_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    rating = models.PositiveSmallIntegerField()
    review_title = models.CharField(max_length=150, null=True, blank=True)
    review_text = models.TextField(null=True, blank=True)
    is_anonymous = models.BooleanField(default=False)
    eligibility_reason = models.CharField(
        max_length=20,
        choices=ReviewEligibilityReason.choices,
        default=ReviewEligibilityReason.OFFER_RECEIVED,
    )
    moderation_status = models.CharField(
        max_length=20,
        choices=ReviewModerationStatus.choices,
        default=ReviewModerationStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_reviews"
        indexes = [
            models.Index(fields=["company", "moderation_status"], name="comp_review_mod_idx"),
        ]

    def __str__(self):
        return f"Review for {self.company.name} by Candidate {self.candidate_id} ({self.rating}/5)"
