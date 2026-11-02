# backend/apps/master_data/services.py
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q

from apps.accounts.audit import record_audit_log
from apps.companies.models import Company
from shared.constants.master_data import MasterDataCategory
from shared.exceptions.api import ApiError

from .models import MasterDataItem, SkillAliasRelation

CACHE_KEY_PREFIX = "master_data"


def get_cache_key(category: str) -> str:
    return f"{CACHE_KEY_PREFIX}:{category.lower()}"


def invalidate_master_data_cache(category: str = None):
    if category:
        cache.delete(get_cache_key(category))
    else:
        for cat in MasterDataCategory.values:
            cache.delete(get_cache_key(cat))


def compute_usage_count(item: MasterDataItem) -> int:
    """Check foreign keys in other tables referencing this master data item."""
    count = 0
    if item.category == MasterDataCategory.INDUSTRY:
        count += Company.objects.filter(industry_id=item.id).count()
    # In upcoming modules, check:
    # - jobs.department_id, jobs.work_mode_id, jobs.experience_level_id
    # - candidate_skills.skill_id, job_skills.skill_id
    return count


def list_public_master_data(category: str, search: str = None, limit: int = 100):
    """Fetch active items. Uses Redis caching when not searching."""
    clean_cat = category.strip().lower()
    if clean_cat not in MasterDataCategory.values:
        raise ApiError("invalid_category", f"Category '{clean_cat}' is not recognized.", 400)

    # Use cache if standard list without search
    cache_key = get_cache_key(clean_cat)
    if not search:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    qs = MasterDataItem.objects.filter(category=clean_cat, is_active=True)

    if search and search.strip():
        term = search.strip()
        if clean_cat == MasterDataCategory.SKILL:
            # Match item value OR alias synonyms (e.g. 'JS' -> 'JavaScript')
            matched_target_ids = SkillAliasRelation.objects.filter(
                alias_text__icontains=term
            ).values_list("target_skill_id", flat=True)
            qs = qs.filter(Q(value__icontains=term) | Q(id__in=matched_target_ids))
        else:
            qs = qs.filter(Q(value__icontains=term) | Q(description__icontains=term))

    results = list(
        qs.values("id", "key", "value", "description", "parent_id", "display_order")[:limit]
    )

    if not search:
        cache.set(cache_key, results, timeout=3600)  # cache for 1 hour

    return results


def list_admin_master_data(category: str = None, search: str = None, is_active: bool = None):
    qs = MasterDataItem.objects.all()

    if category and category.lower() != "all":
        qs = qs.filter(category=category.lower())

    if search:
        s = search.strip()
        qs = qs.filter(Q(value__icontains=s) | Q(key__icontains=s))

    if is_active is not None:
        qs = qs.filter(is_active=is_active)

    items = []
    for item in qs.order_by("category", "display_order", "value"):
        items.append({
            "id": item.id,
            "category": item.category,
            "key": item.key,
            "value": item.value,
            "description": item.description,
            "parent_id": item.parent_id,
            "display_order": item.display_order,
            "is_active": item.is_active,
            "usage_count": compute_usage_count(item),
            "created_at": item.created_at,
        })
    return items


@transaction.atomic
def create_master_data_item(*, category: str, key: str, value: str, description: str = "", parent_id: int = None, display_order: int = 0, admin_user=None, request=None):
    clean_cat = category.strip().lower()
    clean_key = key.strip().lower()

    if clean_cat not in MasterDataCategory.values:
        raise ApiError("invalid_category", f"Category '{clean_cat}' is not allowed.", 400)

    if MasterDataItem.objects.filter(category=clean_cat, key=clean_key).exists():
        raise ApiError("duplicate_item", f"An item with key '{clean_key}' already exists in category '{clean_cat}'.", 409)

    item = MasterDataItem.objects.create(
        category=clean_cat,
        key=clean_key,
        value=value.strip(),
        description=description.strip() if description else None,
        parent_id=parent_id,
        display_order=display_order,
    )

    invalidate_master_data_cache(clean_cat)

    record_audit_log(
        actor=admin_user,
        action="master_data_created",
        entity_type="master_data_item",
        entity_id=item.id,
        new_values={"category": item.category, "key": item.key, "value": item.value},
        request=request,
    )
    return item


@transaction.atomic
def update_master_data_item(*, item_id: int, value: str = None, description: str = None, is_active: bool = None, display_order: int = None, parent_id: int = None, admin_user=None, request=None):
    item = MasterDataItem.objects.filter(id=item_id).first()
    if not item:
        raise ApiError("item_not_found", "Master data item not found.", 404)

    old_values = {"value": item.value, "is_active": item.is_active, "display_order": item.display_order}

    if value is not None:
        item.value = value.strip()
    if description is not None:
        item.description = description.strip()
    if is_active is not None:
        item.is_active = is_active
    if display_order is not None:
        item.display_order = display_order
    if parent_id is not None:
        item.parent_id = parent_id

    item.save()
    invalidate_master_data_cache(item.category)

    record_audit_log(
        actor=admin_user,
        action="master_data_updated",
        entity_type="master_data_item",
        entity_id=item.id,
        old_values=old_values,
        new_values={"value": item.value, "is_active": item.is_active, "display_order": item.display_order},
        request=request,
    )
    return item


@transaction.atomic
def delete_master_data_item(*, item_id: int, admin_user=None, request=None):
    item = MasterDataItem.objects.filter(id=item_id).first()
    if not item:
        raise ApiError("item_not_found", "Master data item not found.", 404)

    usage = compute_usage_count(item)
    if usage > 0:
        raise ApiError(
            "in_use",
            f"Cannot delete '{item.value}'. It is currently referenced by {usage} record(s). Deactivate it instead.",
            409,
        )

    cat = item.category
    item_id_val = item.id
    item_val = item.value
    item.delete()

    invalidate_master_data_cache(cat)

    record_audit_log(
        actor=admin_user,
        action="master_data_deleted",
        entity_type="master_data_item",
        entity_id=item_id_val,
        old_values={"category": cat, "value": item_val},
        request=request,
    )



@transaction.atomic
def reorder_master_data_items(*, category: str, items: list, admin_user=None, request=None):
    """Batch update display_order for items in a category."""
    clean_cat = category.strip().lower()
    for entry in items:
        item_id = entry.get("id")
        order = entry.get("display_order", 0)
        MasterDataItem.objects.filter(id=item_id, category=clean_cat).update(display_order=order)

    invalidate_master_data_cache(clean_cat)

    record_audit_log(
        actor=admin_user,
        action="master_data_reordered",
        entity_type="master_data_category",
        details={"category": clean_cat, "count": len(items)},
        request=request,
    )
    return {"message": f"Items for category '{clean_cat}' reordered successfully."}


def list_skill_aliases():
    return SkillAliasRelation.objects.all().select_related("target_skill", "source_skill").order_by("-created_at")


@transaction.atomic
def create_skill_alias(*, target_skill_id: int, alias_text: str = None, source_skill_id: int = None, confidence_score: int = 100, admin_user=None, request=None):
    target_skill = MasterDataItem.objects.filter(id=target_skill_id, category=MasterDataCategory.SKILL).first()
    if not target_skill:
        raise ApiError("skill_not_found", "Target skill not found.", 404)

    source_skill = None
    if source_skill_id:
        source_skill = MasterDataItem.objects.filter(id=source_skill_id, category=MasterDataCategory.SKILL).first()

    alias = SkillAliasRelation.objects.create(
        alias_text=alias_text.strip() if alias_text else None,
        target_skill=target_skill,
        source_skill=source_skill,
        confidence_score=confidence_score,
    )

    invalidate_master_data_cache(MasterDataCategory.SKILL)

    record_audit_log(
        actor=admin_user,
        action="skill_alias_created",
        entity_type="skill_alias_relation",
        entity_id=alias.id,
        details={"alias_text": alias.alias_text, "target": target_skill.value},
        request=request,
    )
    return alias


@transaction.atomic
def delete_skill_alias(*, alias_id: int, admin_user=None, request=None):
    alias = SkillAliasRelation.objects.filter(id=alias_id).first()
    if not alias:
        raise ApiError("alias_not_found", "Skill alias not found.", 404)

    target_name = alias.target_skill.value
    alias_text = alias.alias_text
    alias.delete()

    invalidate_master_data_cache(MasterDataCategory.SKILL)

    record_audit_log(
        actor=admin_user,
        action="skill_alias_deleted",
        entity_type="skill_alias_relation",
        entity_id=alias_id,
        details={"alias_text": alias_text, "target": target_name},
        request=request,
    )



@transaction.atomic
def reorder_master_data_items(*, category: str, items: list, admin_user=None, request=None):
    """Batch update display_order for items in a category."""
    clean_cat = category.strip().lower()
    for entry in items:
        item_id = entry.get("id")
        order = entry.get("display_order", 0)
        MasterDataItem.objects.filter(id=item_id, category=clean_cat).update(display_order=order)

    invalidate_master_data_cache(clean_cat)

    record_audit_log(
        actor=admin_user,
        action="master_data_reordered",
        entity_type="master_data_category",
        details={"category": clean_cat, "count": len(items)},
        request=request,
    )
    return {"message": f"Items for category '{clean_cat}' reordered successfully."}


def list_skill_aliases():
    return SkillAliasRelation.objects.all().select_related("target_skill", "source_skill").order_by("-created_at")


@transaction.atomic
def create_skill_alias(*, target_skill_id: int, alias_text: str = None, source_skill_id: int = None, confidence_score: int = 100, admin_user=None, request=None):
    target_skill = MasterDataItem.objects.filter(id=target_skill_id, category=MasterDataCategory.SKILL).first()
    if not target_skill:
        raise ApiError("skill_not_found", "Target skill not found.", 404)

    source_skill = None
    if source_skill_id:
        source_skill = MasterDataItem.objects.filter(id=source_skill_id, category=MasterDataCategory.SKILL).first()

    alias = SkillAliasRelation.objects.create(
        alias_text=alias_text.strip() if alias_text else None,
        target_skill=target_skill,
        source_skill=source_skill,
        confidence_score=confidence_score,
    )

    invalidate_master_data_cache(MasterDataCategory.SKILL)

    record_audit_log(
        actor=admin_user,
        action="skill_alias_created",
        entity_type="skill_alias_relation",
        entity_id=alias.id,
        details={"alias_text": alias.alias_text, "target": target_skill.value},
        request=request,
    )
    return alias


@transaction.atomic
def delete_skill_alias(*, alias_id: int, admin_user=None, request=None):
    alias = SkillAliasRelation.objects.filter(id=alias_id).first()
    if not alias:
        raise ApiError("alias_not_found", "Skill alias not found.", 404)

    target_name = alias.target_skill.value
    alias_text = alias.alias_text
    alias.delete()

    invalidate_master_data_cache(MasterDataCategory.SKILL)

    record_audit_log(
        actor=admin_user,
        action="skill_alias_deleted",
        entity_type="skill_alias_relation",
        entity_id=alias_id,
        details={"alias_text": alias_text, "target": target_name},
        request=request,
    )
