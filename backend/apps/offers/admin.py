from django.contrib import admin
from .models import Offer, OfferAttachment, OfferLetterTemplate


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "offer_reference",
        "application",
        "salary",
        "currency",
        "status",
        "expiration_date",
        "created_at",
    )
    list_filter = ("status", "currency", "employment_type", "pay_frequency")
    search_fields = (
        "id",
        "application__candidate__user__email",
        "application__candidate__user__full_name",
        "application__job__title",
    )
    readonly_fields = ("created_at", "updated_at", "offer_reference")


@admin.register(OfferAttachment)
class OfferAttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "offer", "file_name", "file_size", "uploaded_at")
    search_fields = ("file_name", "offer__id")


@admin.register(OfferLetterTemplate)
class OfferLetterTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "template_name", "version", "is_active", "created_at")
    list_filter = ("is_active", "company")
    search_fields = ("template_name", "company__name")
