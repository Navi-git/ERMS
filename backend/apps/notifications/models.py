from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    # Applications
    APPLICATION_RECEIVED = "application_received", "Application Received"
    APPLICATION_STATUS_CHANGED = "application_status_changed", "Application Status Changed"

    # Interviews
    INTERVIEW_SCHEDULED = "interview_scheduled", "Interview Scheduled"
    INTERVIEW_RESCHEDULED = "interview_rescheduled", "Interview Rescheduled"
    INTERVIEW_CANCELLED = "interview_cancelled", "Interview Cancelled"
    INTERVIEW_REMINDER = "interview_reminder", "Interview Reminder"

    # Offers
    OFFER_SENT = "offer_sent", "Offer Sent"
    OFFER_ACCEPTED = "offer_accepted", "Offer Accepted"
    OFFER_DECLINED = "offer_declined", "Offer Declined"
    OFFER_WITHDRAWN = "offer_withdrawn", "Offer Withdrawn"

    # Messaging
    MESSAGE_RECEIVED = "message_received", "Message Received"

    # Billing & Subscription
    SUBSCRIPTION_EXPIRING = "subscription_expiring", "Subscription Expiring"
    PAYMENT_FAILED = "payment_failed", "Payment Failed"
    INVOICE_GENERATED = "invoice_generated", "Invoice Generated"

    # System & Platform
    SYSTEM = "system", "System"


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_column="user_id",
    )
    source_type = models.CharField(max_length=30)
    source_id = models.BigIntegerField(null=True, blank=True)
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    redirect_url = models.CharField(max_length=500, null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.user.email} - {self.title}"


class BroadcastAudience(models.TextChoices):
    ALL = "all", "All Users"
    CANDIDATES = "candidates", "Candidates"
    RECRUITERS = "recruiters", "Recruiters"


class Broadcast(models.Model):
    """Super Admin platform announcements & broadcast log."""
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    audience = models.CharField(max_length=20, choices=BroadcastAudience.choices, default=BroadcastAudience.ALL)
    notification_type = models.CharField(max_length=50, default="system")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="broadcasts_created",
        db_column="created_by_id",
    )
    recipient_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "broadcasts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Broadcast: {self.title} ({self.audience})"