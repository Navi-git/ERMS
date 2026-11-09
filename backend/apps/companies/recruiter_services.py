import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction

from apps.master_data.models import MasterDataItem
from shared.exceptions.api import ApiError
from .models import Company, CompanyBenefit, CompanyTalentTrack

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


def get_or_create_recruiter_company(user):
    """Retrieve or initialize the company managed by the given recruiter user."""
    company = Company.objects.filter(admin_user=user).first()
    if not company:
        name = getattr(user, "full_name", None) or f"{user.email.split('@')[0]} Org"
        company = Company.objects.create(name=name, admin_user=user)
    return company


@transaction.atomic
def update_company_profile(company, validated_data):
    """Update company branding, basics, address, and talent tracks."""
    talent_track_ids = validated_data.pop("talent_track_ids", None)
    industry_id = validated_data.pop("industry_id", None)

    if industry_id is not None:
        if industry_id == 0 or industry_id == "":
            company.industry = None
        else:
            industry_item = MasterDataItem.objects.filter(id=industry_id, category="industry").first()
            if not industry_item:
                raise ApiError("invalid_industry", "Selected industry does not exist.", 400)
            company.industry = industry_item

    for attr, val in validated_data.items():
        setattr(company, attr, val)

    company.save()

    # Reconcile talent tracks if provided
    if talent_track_ids is not None:
        CompanyTalentTrack.objects.filter(company=company).delete()
        valid_items = MasterDataItem.objects.filter(id__in=talent_track_ids, category="talent_track")
        to_create = [
            CompanyTalentTrack(company=company, master_data_item=item)
            for item in valid_items
        ]
        CompanyTalentTrack.objects.bulk_create(to_create)

    return company


def upload_company_branding(company, image_file, field_name="logo_url"):
    """
    Validate and save branding image (logo or cover) to media storage.
    Updates the specified field (logo_url or cover_image_url) on the company.
    """
    if image_file.size > MAX_IMAGE_SIZE:
        raise ApiError("file_too_large", "Image must be smaller than 5 MB.", 400)

    content_type = getattr(image_file, "content_type", "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ApiError("invalid_file_type", "Image must be JPEG, PNG, or WebP.", 400)

    ext = os.path.splitext(image_file.name)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    prefix = "logo" if field_name == "logo_url" else "cover"
    filename = f"company_branding/{prefix}_{company.id}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = default_storage.save(filename, image_file)
    file_url = f"{settings.MEDIA_URL.rstrip('/')}/{saved_path.lstrip('/')}"

    setattr(company, field_name, file_url)
    company.save(update_fields=[field_name, "updated_at"])
    return file_url


def create_or_update_benefit(company, data, benefit_id=None):
    """Add or edit a company culture benefit."""
    if benefit_id:
        benefit = CompanyBenefit.objects.filter(company=company, id=benefit_id).first()
        if not benefit:
            raise ApiError("not_found", "Company benefit not found.", 404)
        for key, val in data.items():
            setattr(benefit, key, val)
        benefit.save()
        return benefit

    return CompanyBenefit.objects.create(
        company=company,
        name=data["name"],
        custom_description=data.get("custom_description", ""),
        display_order=data.get("display_order", 0),
        is_active=data.get("is_active", True),
    )


def delete_benefit(company, benefit_id):
    """Remove a company culture benefit."""
    deleted, _ = CompanyBenefit.objects.filter(company=company, id=benefit_id).delete()
    if not deleted:
        raise ApiError("not_found", "Company benefit not found.", 404)

