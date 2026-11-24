"""ERD Tables for Offers Module:
- Table 28: offers
- Table 29: offer_attachments
- Table 30: offer_letter_templates
"""
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.jobs.models import EmploymentType


class OfferStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SENT = "sent", "Sent"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    EXPIRED = "expired", "Expired"
    WITHDRAWN = "withdrawn", "Withdrawn"


class PayFrequency(models.TextChoices):
    ANNUAL = "annual", "Annual"
    SEMI_MONTHLY = "semi_monthly", "Semi-Monthly (24 periods)"
    BI_WEEKLY = "bi_weekly", "Bi-Weekly (26 periods)"
    MONTHLY = "monthly", "Monthly (12 periods)"


class EquityType(models.TextChoices):
    ISO = "ISO", "Incentive Stock Options (ISO)"
    RSU = "RSU", "Restricted Stock Units (RSU)"
    NSO = "NSO", "Non-Qualified Stock Options (NSO)"


class BonusType(models.TextChoices):
    PERFORMANCE = "performance", "Performance Bonus"
    SIGNING = "signing", "Signing Bonus"
    REFERRAL = "referral", "Referral Bonus"
    ANNUAL = "annual", "Annual Target Bonus"


class WorkArrangement(models.TextChoices):
    ON_SITE = "on_site", "On-site"
    HYBRID = "hybrid", "Hybrid"
    REMOTE = "remote", "Remote"


class Offer(models.Model):
    """Table 28: offers — Formal employment compensation package and offer letter."""

    application = models.ForeignKey(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="offers",
        db_column="application_id",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_offers",
        db_column="created_by",
    )

    # Core Compensation
    salary = models.IntegerField(help_text="Annual base compensation in the specified currency")
    currency = models.CharField(max_length=3, default="USD")
    employment_type = models.CharField(
        max_length=50,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    pay_frequency = models.CharField(
        max_length=50,
        choices=PayFrequency.choices,
        default=PayFrequency.SEMI_MONTHLY,
    )
    start_date = models.DateField(null=True, blank=True)

    # Equity Grant Package
    equity_type = models.CharField(max_length=50, choices=EquityType.choices, null=True, blank=True)
    equity_units = models.IntegerField(null=True, blank=True)
    equity_vesting_schedule = models.TextField(null=True, blank=True)

    # Bonus & Variable Incentives
    bonus_type = models.CharField(max_length=50, choices=BonusType.choices, null=True, blank=True)
    bonus_target_percent = models.IntegerField(null=True, blank=True)
    bonus_target_amount = models.IntegerField(null=True, blank=True)

    # Sign-on Bonus
    sign_on_bonus = models.IntegerField(null=True, blank=True)
    sign_on_bonus_terms = models.TextField(null=True, blank=True)

    # Reporting Line & Org
    reports_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="direct_report_offers",
        db_column="reports_to_user_id",
    )
    reporting_manager_name = models.CharField(max_length=255, null=True, blank=True)
    reporting_manager_title = models.CharField(max_length=255, null=True, blank=True)
    department = models.CharField(max_length=255, null=True, blank=True)
    work_arrangement = models.CharField(
        max_length=50,
        choices=WorkArrangement.choices,
        default=WorkArrangement.HYBRID,
    )

    # Offer Template & Letter Content
    template = models.ForeignKey(
        "OfferLetterTemplate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="offers",
    )
    letter_content = models.TextField(null=True, blank=True, help_text="Rendered markdown or HTML letter body")
    offer_document_url = models.TextField(null=True, blank=True)

    # Status & Critical Dates
    status = models.CharField(
        max_length=30,
        choices=OfferStatus.choices,
        default=OfferStatus.DRAFT,
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)

    # Decline Tracking
    decline_reason = models.CharField(max_length=100, null=True, blank=True)
    candidate_feedback = models.TextField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)

    # Withdrawal Tracking
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdrawn_reason = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "offers"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["application", "status"], name="offers_app_status_idx"),
            models.Index(fields=["created_by", "sent_at"], name="offers_creator_sent_idx"),
            models.Index(fields=["status", "expiration_date"], name="offers_status_exp_idx"),
        ]

    def __str__(self):
        return f"Offer #{self.id} ({self.application_id}) - {self.status}"

    @property
    def offer_reference(self) -> str:
        return f"OFF-{self.id:04d}"

    @property
    def is_expired(self) -> bool:
        if self.status == OfferStatus.EXPIRED:
            return True
        if self.status == OfferStatus.SENT and self.expiration_date:
            return self.expiration_date < timezone.now().date()
        return False

    @property
    def total_target_compensation(self) -> int:
        total = self.salary or 0
        if self.sign_on_bonus:
            total += self.sign_on_bonus
        if self.bonus_target_amount:
            total += self.bonus_target_amount
        elif self.bonus_target_percent and self.salary:
            total += (self.salary * self.bonus_target_percent) // 100
        return total

    @property
    def per_period_amount(self) -> Decimal:
        if not self.salary:
            return Decimal("0.00")
        divisor = {
            PayFrequency.SEMI_MONTHLY: 24,
            PayFrequency.BI_WEEKLY: 26,
            PayFrequency.MONTHLY: 12,
            PayFrequency.ANNUAL: 1,
        }.get(self.pay_frequency, 24)
        return Decimal(round(self.salary / divisor, 2))


class OfferAttachment(models.Model):
    """Table 29: offer_attachments — Supporting collateral (benefits, handbook, IP agreements)."""

    offer = models.ForeignKey(
        Offer,
        on_delete=models.CASCADE,
        related_name="attachments",
        db_column="offer_id",
    )
    file_name = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="uploaded_by",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offer_attachments"
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"{self.file_name} ({self.offer_id})"


class OfferLetterTemplate(models.Model):
    """Table 30: offer_letter_templates — Reusable company offer letter templates."""

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="offer_templates",
        db_column="company_id",
    )
    template_name = models.CharField(max_length=255)
    body_template = models.TextField(help_text="Letter markdown/HTML template with merge placeholders")
    variables_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text="Schema or description of placeholder fields supported",
    )
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_offer_templates",
        db_column="created_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "offer_letter_templates"
        ordering = ["-is_active", "template_name"]
        indexes = [
            models.Index(fields=["company", "is_active"], name="offer_tpl_company_idx"),
        ]

    def __str__(self):
        return f"{self.template_name} v{self.version} ({self.company.name})"
