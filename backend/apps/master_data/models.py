"""ERD table: master_data_items (one managed taxonomy table)."""
from django.db import models


class MasterDataItem(models.Model):
    category = models.CharField(max_length=50)  # industry, job_category, experience_level, ...
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "master_data_items"
        indexes = [models.Index(fields=["category", "key"], name="master_data_cat_key_idx")]

    def __str__(self):
        return f"{self.category}:{self.key}"
