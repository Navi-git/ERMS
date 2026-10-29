import pytest
from django.db import connection

from apps.master_data.models import MasterDataItem


@pytest.mark.django_db
def test_master_data_items_columns_match_erd():
    with connection.cursor() as cursor:
        cols = {c.name for c in connection.introspection.get_table_description(cursor, "master_data_items")}
    assert cols == {
        "id", "category", "key", "value", "description",
        "display_order", "is_active", "created_at", "updated_at",
    }


@pytest.mark.django_db
def test_defaults():
    item = MasterDataItem.objects.create(category="industry", key="it", value="Information Technology")
    assert item.display_order == 0 and item.is_active is True
