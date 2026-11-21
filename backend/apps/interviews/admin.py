from django.contrib import admin
from .models import (
    Interview,
    InterviewParticipant,
    InterviewFeedback,
    InterviewFeedbackCriteria,
)


class InterviewParticipantInline(admin.TabularInline):
    model = InterviewParticipant
    extra = 0


class InterviewFeedbackCriteriaInline(admin.TabularInline):
    model = InterviewFeedbackCriteria
    extra = 0


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "job",
        "application",
        "interview_type",
        "scheduled_at",
        "duration_minutes",
        "interview_status",
        "feedback_submitted",
    )
    list_filter = ("interview_status", "interview_type", "feedback_submitted")
    search_fields = ("application__candidate__user__full_name", "job__title")
    inlines = [InterviewParticipantInline]


@admin.register(InterviewParticipant)
class InterviewParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "interview",
        "participant_type",
        "participant_role",
        "user",
        "external_name",
        "response_status",
        "nudge_count",
    )
    list_filter = ("participant_type", "participant_role", "response_status")


@admin.register(InterviewFeedback)
class InterviewFeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "interview",
        "submitted_by",
        "on_behalf_of_participant",
        "recommendation",
        "overall_score",
        "submitted_at",
    )
    list_filter = ("recommendation",)
    inlines = [InterviewFeedbackCriteriaInline]
