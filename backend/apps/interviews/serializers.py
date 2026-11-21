from rest_framework import serializers
from .models import (
    Interview,
    InterviewParticipant,
    InterviewFeedback,
    InterviewFeedbackCriteria,
    InterviewStatus,
    InterviewType,
    ParticipantType,
    ParticipantRole,
    ResponseStatus,
    Recommendation,
)


class InterviewParticipantSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    profile_picture_url = serializers.CharField(source="user.profile_picture_url", read_only=True)

    class Meta:
        model = InterviewParticipant
        fields = [
            "id",
            "user",
            "display_name",
            "email",
            "profile_picture_url",
            "participant_type",
            "participant_role",
            "external_name",
            "external_email",
            "response_status",
            "invitation_sent_at",
            "joined_at",
            "last_nudged_at",
            "nudge_count",
            "created_at",
        ]


class InterviewFeedbackCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewFeedbackCriteria
        fields = [
            "id",
            "criterion_key",
            "criterion_label",
            "criterion_description",
            "benchmark_level",
            "score",
            "max_score",
            "display_order",
        ]


class InterviewFeedbackSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source="submitted_by.full_name", read_only=True)
    on_behalf_of_name = serializers.CharField(source="on_behalf_of_participant.display_name", read_only=True)
    criteria_ratings = InterviewFeedbackCriteriaSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewFeedback
        fields = [
            "id",
            "interview",
            "submitted_by",
            "submitted_by_name",
            "on_behalf_of_participant",
            "on_behalf_of_name",
            "rating",
            "technical_score",
            "communication_score",
            "overall_score",
            "recommendation",
            "comments",
            "growth_areas",
            "internal_notes",
            "criteria_ratings",
            "submitted_at",
        ]


class RecruiterInterviewListSerializer(serializers.ModelSerializer):
    candidate = serializers.SerializerMethodField()
    job = serializers.SerializerMethodField()
    participants = InterviewParticipantSerializer(many=True, read_only=True)
    feedbacks = InterviewFeedbackSerializer(many=True, read_only=True)
    display_status = serializers.CharField(read_only=True)
    interview_type_display = serializers.CharField(source="get_interview_type_display", read_only=True)

    class Meta:
        model = Interview
        fields = [
            "id",
            "application_id",
            "job",
            "candidate",
            "interview_type",
            "interview_type_display",
            "scheduled_at",
            "duration_minutes",
            "meeting_link",
            "location",
            "interview_status",
            "display_status",
            "feedback_submitted",
            "invitation_note",
            "cancellation_reason",
            "cancelled_at",
            "participants",
            "feedbacks",
            "created_at",
            "updated_at",
        ]

    def get_candidate(self, obj):
        cand_user = obj.application.candidate.user
        return {
            "id": obj.application.candidate.id,
            "user_id": cand_user.id,
            "full_name": cand_user.full_name,
            "email": cand_user.email,
            "phone": cand_user.phone,
            "profile_picture_url": cand_user.profile_picture_url,
            "headline": getattr(obj.application.candidate, "headline", "") or "",
        }

    def get_job(self, obj):
        return {
            "id": obj.job.id,
            "title": obj.job.job_title,
            "department": getattr(obj.job.department, "value", "") if obj.job.department else "",
            "location": getattr(obj.job, "location", "") or "",
            "workplace_type": getattr(obj.job.work_mode, "value", "") if getattr(obj.job, "work_mode", None) else "",
        }


class ParticipantInputSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, allow_null=True)
    external_name = serializers.CharField(required=False, allow_blank=True)
    external_email = serializers.EmailField(required=False, allow_blank=True)
    participant_role = serializers.ChoiceField(
        choices=ParticipantRole.choices, default=ParticipantRole.PANELIST
    )


class RecruiterScheduleInterviewSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()
    interview_type = serializers.ChoiceField(choices=InterviewType.choices, default=InterviewType.TECHNICAL)
    scheduled_at = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(default=60, min_value=15, max_value=480)
    meeting_link = serializers.CharField(required=False, allow_blank=True, max_length=500)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    invitation_note = serializers.CharField(required=False, allow_blank=True)
    job_stage_id = serializers.IntegerField(required=False, allow_null=True)
    participants = ParticipantInputSerializer(many=True, required=False)


class RescheduleInterviewSerializer(serializers.Serializer):
    scheduled_at = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(required=False, min_value=15, max_value=480)
    meeting_link = serializers.CharField(required=False, allow_blank=True, max_length=500)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    reason = serializers.CharField(required=False, allow_blank=True)


class CancelInterviewSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)


class InterviewOutcomeSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=["completed", "no_show"])
    notes = serializers.CharField(required=False, allow_blank=True)


class ScorecardCriterionInputSerializer(serializers.Serializer):
    criterion_key = serializers.CharField(max_length=60)
    criterion_label = serializers.CharField(max_length=150)
    criterion_description = serializers.CharField(required=False, allow_blank=True)
    benchmark_level = serializers.CharField(required=False, allow_blank=True)
    score = serializers.IntegerField(min_value=1, max_value=5)
    max_score = serializers.IntegerField(default=5)


class SubmitScorecardSerializer(serializers.Serializer):
    recommendation = serializers.ChoiceField(choices=Recommendation.choices)
    rating = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    technical_score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    communication_score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    overall_score = serializers.FloatField(required=False, allow_null=True, min_value=1.0, max_value=5.0)
    comments = serializers.CharField(required=False, allow_blank=True)
    growth_areas = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)
    on_behalf_of_participant_id = serializers.IntegerField(required=False, allow_null=True)
    criteria_ratings = ScorecardCriterionInputSerializer(many=True, required=False)


class CandidateInterviewSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.job_title", read_only=True)
    company_name = serializers.CharField(source="job.company.name", read_only=True)
    company_logo_url = serializers.CharField(source="job.company.logo_url", read_only=True)
    interview_type_display = serializers.CharField(source="get_interview_type_display", read_only=True)
    interviewers = serializers.SerializerMethodField()
    my_response_status = serializers.SerializerMethodField()
    display_status = serializers.CharField(read_only=True)

    class Meta:
        model = Interview
        fields = [
            "id",
            "application_id",
            "job_id",
            "job_title",
            "company_name",
            "company_logo_url",
            "interview_type",
            "interview_type_display",
            "scheduled_at",
            "duration_minutes",
            "meeting_link",
            "location",
            "interview_status",
            "display_status",
            "invitation_note",
            "cancellation_reason",
            "feedback_submitted",
            "interviewers",
            "my_response_status",
            "created_at",
        ]

    def get_interviewers(self, obj):
        interviewers = obj.participants.filter(participant_type=ParticipantType.INTERVIEWER)
        return [
            {
                "id": p.id,
                "name": p.display_name,
                "role": p.get_participant_role_display(),
                "profile_picture_url": p.user.profile_picture_url if p.user else None,
            }
            for p in interviewers
        ]

    def get_my_response_status(self, obj):
        request = self.context.get("request")
        if request and request.user:
            candidate_part = obj.participants.filter(
                user=request.user, participant_type=ParticipantType.CANDIDATE
            ).first()
            if candidate_part:
                return candidate_part.response_status
        return ResponseStatus.INVITED
