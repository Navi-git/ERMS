from django.contrib import admin
from .models import (
    Company,
    CompanyBenefit,
    CompanyTalentTrack,
    CompanyVerification,
    CompanyVerificationDocument,
    CompanyReview,
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "industry", "verification_status", "company_size", "city", "created_at")
    list_filter = ("verification_status", "industry", "company_size")
    search_fields = ("name", "registration_number", "tax_id", "email")


@admin.register(CompanyBenefit)
class CompanyBenefitAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "name", "display_order", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "company__name")


@admin.register(CompanyTalentTrack)
class CompanyTalentTrackAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "master_data_item", "created_at")
    search_fields = ("company__name", "master_data_item__value")


class CompanyVerificationDocumentInline(admin.TabularInline):
    model = CompanyVerificationDocument
    extra = 0


@admin.register(CompanyVerification)
class CompanyVerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "status", "risk_level", "risk_score", "submitted_at", "reviewed_at")
    list_filter = ("status", "risk_level")
    search_fields = ("company__name", "submitted_by__email", "reviewed_by__email")
    inlines = [CompanyVerificationDocumentInline]


@admin.register(CompanyVerificationDocument)
class CompanyVerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "verification", "document_type", "original_filename", "checksum_sha256", "is_current", "status")
    list_filter = ("document_type", "status", "is_current")
    search_fields = ("original_filename", "checksum_sha256")


@admin.register(CompanyReview)
class CompanyReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "candidate", "rating", "moderation_status", "is_anonymous", "created_at")
    list_filter = ("moderation_status", "rating", "is_anonymous")
    search_fields = ("company__name", "review_title")

