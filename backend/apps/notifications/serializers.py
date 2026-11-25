from rest_framework import serializers
from apps.notifications.models import Broadcast, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "source_type",
            "source_id",
            "notification_type",
            "title",
            "message",
            "redirect_url",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields


class BroadcastSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Broadcast
        fields = [
            "id",
            "title",
            "message",
            "audience",
            "notification_type",
            "created_by",
            "created_by_name",
            "recipient_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "recipient_count", "created_at"]


class CreateBroadcastSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    audience = serializers.ChoiceField(choices=["all", "candidates", "recruiters"], default="all")
    notification_type = serializers.CharField(max_length=50, default="system")
    redirect_url = serializers.CharField(max_length=500, required=False, allow_blank=True)