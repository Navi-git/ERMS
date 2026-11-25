# backend/apps/master_data/serializers.py
from rest_framework import serializers
from .models import MasterDataItem, SkillAliasRelation


class MasterDataItemSerializer(serializers.ModelSerializer):
    usage_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = MasterDataItem
        fields = [
            "id", "category", "key", "value", "description",
            "parent", "display_order", "is_active", "usage_count", "created_at"
        ]


class MasterDataCreateSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=50)
    key = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    display_order = serializers.IntegerField(default=0, required=False)


class MasterDataUpdateSerializer(serializers.Serializer):
    value = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    display_order = serializers.IntegerField(required=False)
    parent_id = serializers.IntegerField(required=False, allow_null=True)


class ReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    display_order = serializers.IntegerField(required=True)


class MasterDataReorderSerializer(serializers.Serializer):
    items = serializers.ListField(child=ReorderItemSerializer())


class SkillAliasSerializer(serializers.ModelSerializer):
    target_skill_name = serializers.CharField(source="target_skill.value", read_only=True)

    class Meta:
        model = SkillAliasRelation
        fields = ["id", "alias_text", "source_skill", "target_skill", "target_skill_name", "confidence_score"]


class SkillAliasCreateSerializer(serializers.Serializer):
    target_skill_id = serializers.IntegerField(required=True)
    alias_text = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    source_skill_id = serializers.IntegerField(required=False, allow_null=True)
    confidence_score = serializers.IntegerField(required=False, default=100, min_value=0, max_value=100)