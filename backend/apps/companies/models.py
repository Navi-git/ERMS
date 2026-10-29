"""ERD table: companies.

APPROVED ERD CHANGE: `industry_id` is nullable here (the ERD says NOT NULL) so a recruiter can
register with only a company name. The verification-submission step must require it.
"""
from django.conf import settings
from django.db import models


class Company(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)  # markdown

    registration_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    tax_id = models.CharField(max_length=100, null=True, blank=True)
    industry = models.ForeignKey(
        "master_data.MasterDataItem", null=True, blank=True, on_delete=models.PROTECT,
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
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="administered_companies",
    )
    verification_status = models.CharField(max_length=30, default="PENDING")
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="+", db_column="suspended_by",
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
