"""ERD table: master_data_items (one managed taxonomy table)."""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class MasterDataItem(models.Model):
    category = models.CharField(max_length=50, db_index=True)  # industry, job_category, experience_level, ...
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    display_order = models.IntegerField(default=0)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "master_data_items"
        constraints = [
            models.UniqueConstraint(fields=["category", "key"], name="unique_category_key")
        ]
        indexes = [models.Index(fields=["category", "is_active", "display_order"], name="cat_active_order_idx")]
        ordering = ["display_order", "value"]

    def __str__(self):
        return f"{self.category}:{self.key}"


class SkillAliasRelation(models.Model):
    alias_text = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    source_skill = models.ForeignKey(
        MasterDataItem, null=True, blank=True, on_delete=models.CASCADE, related_name="source_relations"
    )
    target_skill = models.ForeignKey(
        MasterDataItem, on_delete=models.CASCADE, related_name="target_relations"
    )
    confidence_score = models.IntegerField(
        default=100, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "skill_alias_relations"

    def __str__(self):
        if self.alias_text:
            return f"Alias: {self.alias_text} -> {self.target_skill.value}"
        return f"Relation: {self.confidence_score}% -> {self.target_skill.value} ({self.confidence_score}%)"


# Backward compatibility alias if needed
SkillAliasRealtion = SkillAliasRelation
