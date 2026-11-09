import hashlib
import os
import uuid
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.master_data.models import MasterDataItem
from shared.constants.roles import Role
from shared.exceptions.api import ApiError
from .models import (
    Company,
    CompanyTalentTrack,
    CompanyVerification,
    CompanyVerificationDocument,
    CompanyVerificationStatus,
    VerificationDocumentType,
)

MAX_DOCUMENT_SIZE = 15 * 1024 * 1024  # 15 MB
ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"]


def get_private_compliance_dir(company_id):
    storage_root = getattr(settings, "PRIVATE_STORAGE_ROOT", settings.BASE_DIR / "storage" / "private")
    dest_dir = os.path.join(str(storage_root), "compliance_documents", f"company_{company_id}")
    os.makedirs(dest_dir, exist_ok=True)
    return dest_dir


def get_or_create_verification(company, user):
    """Retrieve existing verification submission or initialize draft."""
    verification = (
        CompanyVerification.objects.filter(company=company)
        .order_by("-submitted_at")
        .first()
    )
    if not verification:
        verification = CompanyVerification.objects.create(
            company=company,
            submitted_by=user,
            designated_recruiter=user,
            status=CompanyVerificationStatus.PENDING,
            review_history=[{
                "action": "draft_created",
                "timestamp": timezone.now().isoformat(),
                "by": user.email,
            }],
        )
    return verification


@transaction.atomic
def upload_verification_document(company, user, document_type, uploaded_file):
    """
    Validate, compute SHA-256 checksum, save to private storage,
    and archive previous uploads of the same type.
    """
    if document_type not in VerificationDocumentType.values:
        raise ApiError("invalid_document_type", f"Document type must be one of {VerificationDocumentType.values}", 400)

    if uploaded_file.size > MAX_DOCUMENT_SIZE:
        raise ApiError("file_too_large", "Document size exceeds 15 MB limit.", 400)

    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise ApiError("invalid_file_extension", "Only PDF, PNG, and JPG documents are accepted.", 400)

    verification = get_or_create_verification(company, user)

    # Compute SHA-256 hash server-side
    sha256 = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        sha256.update(chunk)
    checksum = sha256.hexdigest()

    # Save to private compliance directory
    dest_dir = get_private_compliance_dir(company.id)
    unique_filename = f"{uuid.uuid4().hex}_{document_type}{ext}"
    full_path = os.path.join(dest_dir, unique_filename)

    with open(full_path, "wb+") as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    # Archive previous active upload of this type for audit trail
    CompanyVerificationDocument.objects.filter(
        verification=verification,
        document_type=document_type,
        is_current=True,
    ).update(is_current=False)

    # Create new current document record
    doc = CompanyVerificationDocument.objects.create(
        verification=verification,
        document_type=document_type,
        file_url=unique_filename,
        original_filename=uploaded_file.name,
        file_size=uploaded_file.size,
        checksum_sha256=checksum,
        status=CompanyVerificationStatus.PENDING,
        is_current=True,
        uploaded_by=user,
    )

    return doc


@transaction.atomic
def save_verification_draft(company, user, validated_data):
    """Save draft entity details, hiring scope, and talent tracks."""
    verification = get_or_create_verification(company, user)

    # Update company entity basics
    fields = [
        "name",
        "registration_number",
        "tax_id",
        "website_url",
        "company_size",
        "headquarters_address",
        "city",
        "state",
        "country",
        "postal_code",
    ]
    for f in fields:
        if f in validated_data:
            setattr(company, f, validated_data[f])

    industry_id = validated_data.get("industry_id")
    if industry_id is not None:
        ind = MasterDataItem.objects.filter(id=industry_id, category="industry").first()
        if ind:
            company.industry = ind

    company.save()

    # Update hiring scope on verification
    if "intended_hiring_min" in validated_data:
        verification.intended_hiring_min = validated_data["intended_hiring_min"]
    if "intended_hiring_max" in validated_data:
        verification.intended_hiring_max = validated_data["intended_hiring_max"]

    verification.save()

    # Update talent tracks if provided
    talent_track_ids = validated_data.get("talent_track_ids")
    if talent_track_ids is not None:
        CompanyTalentTrack.objects.filter(company=company).delete()
        valid_items = MasterDataItem.objects.filter(id__in=talent_track_ids, category="talent_track")
        to_create = [
            CompanyTalentTrack(company=company, master_data_item=item)
            for item in valid_items
        ]
        CompanyTalentTrack.objects.bulk_create(to_create)

    return verification


@transaction.atomic
def submit_verification_for_review(company, user, validated_data=None):
    """
    Validate completeness and submit verification for compliance audit.
    Transitions verification and company status to PENDING.
    """
    if validated_data:
        save_verification_draft(company, user, validated_data)

    verification = get_or_create_verification(company, user)

    # Validate essential entity information
    if not company.registration_number:
        raise ApiError("missing_field", "Registration Number (CRN) is required for verification.", 400)
    if not company.tax_id:
        raise ApiError("missing_field", "Federal Tax ID / EIN is required for verification.", 400)
    if not company.industry:
        raise ApiError("missing_field", "Primary Industry Category must be selected.", 400)
    if not company.headquarters_address or not company.city or not company.country:
        raise ApiError("missing_field", "Global Headquarters Address is required.", 400)

    # Validate required legal compliance documents (Certificate of Incorporation & Tax Form)
    current_docs = set(
        verification.documents.filter(is_current=True).values_list("document_type", flat=True)
    )
    if VerificationDocumentType.INCORPORATION not in current_docs:
        raise ApiError("missing_document", "Certificate of Incorporation is required.", 400)
    if VerificationDocumentType.TAX_FORM not in current_docs:
        raise ApiError("missing_document", "Tax Form (W-9 / Form 1099 or National Certificate) is required.", 400)

    # Update verification status
    now = timezone.now()
    verification.status = CompanyVerificationStatus.PENDING
    verification.submitted_at = now
    verification.submitted_by = user
    verification.designated_recruiter = user

    history = verification.review_history or []
    history.append({
        "action": "submitted_for_review",
        "timestamp": now.isoformat(),
        "by": user.email,
    })
    verification.review_history = history
    verification.save()

    # Update company status to PENDING
    company.verification_status = CompanyVerificationStatus.PENDING
    company.save(update_fields=["verification_status", "updated_at"])

    return verification


def get_compliance_document_for_download(user, document_id):
    """Ensure user is authorized and return (file_path, filename)."""
    doc = CompanyVerificationDocument.objects.select_related("verification__company").filter(id=document_id).first()
    if not doc:
        raise ApiError("not_found", "Document not found.", 404)

    is_admin = getattr(user, "role", "") == Role.SUPER_ADMIN
    is_company_recruiter = doc.verification.company.admin_user_id == user.id

    if not (is_admin or is_company_recruiter):
        raise ApiError("forbidden", "You do not have permission to view this document.", 403)

    dest_dir = get_private_compliance_dir(doc.verification.company_id)
    full_path = os.path.join(dest_dir, doc.file_url)

    if not os.path.exists(full_path):
        raise ApiError("file_missing", "Document file could not be found on storage.", 404)

    return full_path, doc.original_filename

