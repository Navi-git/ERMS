import json
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from shared.exceptions.api import ApiError
from .models import (
    Company,
    CompanyVerification,
    CompanyVerificationStatus,
    RiskLevel,
)


def list_company_verifications_queue(
    *,
    search=None,
    status=None,
    risk_level=None,
    industry=None,
):
    """Query company queue with status stats and faceted filtering."""
    queryset = Company.objects.all().select_related("industry").prefetch_related("verifications")

    # Search filter
    if search:
        search = search.strip()
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(registration_number__icontains=search)
            | Q(tax_id__icontains=search)
        )

    # Status filter
    if status and status.upper() != "ALL":
        queryset = queryset.filter(verification_status=status.upper())

    # Risk level filter
    if risk_level and risk_level.upper() != "ALL":
        queryset = queryset.filter(verifications__risk_level=risk_level.upper())

    # Industry filter
    if industry and industry.upper() != "ALL":
        queryset = queryset.filter(
            Q(industry__key=industry) | Q(industry__value=industry)
        )

    # Summary counts for filter tabs (Figma Page 9)
    all_companies = Company.objects.all()
    stats = {
        "total": all_companies.count(),
        "pending": all_companies.filter(verification_status=CompanyVerificationStatus.PENDING).count(),
        "under_review": all_companies.filter(verification_status=CompanyVerificationStatus.UNDER_REVIEW).count(),
        "approved": all_companies.filter(verification_status=CompanyVerificationStatus.APPROVED).count(),
        "rejected": all_companies.filter(verification_status=CompanyVerificationStatus.REJECTED).count(),
    }

    return queryset.order_by("-updated_at"), stats


def get_company_verification_detail(company_id):
    """Retrieve complete audit details for a specific company."""
    company = (
        Company.objects.select_related("industry", "admin_user")
        .prefetch_related(
            "talent_tracks__master_data_item",
            "verifications__documents",
            "verifications__reviewed_by",
        )
        .filter(id=company_id)
        .first()
    )
    if not company:
        raise ApiError("not_found", "Company record not found.", 404)
    return company


@transaction.atomic
def start_verification_review(company_id, admin_user):
    """Assign company verification to reviewing admin and set status to UNDER_REVIEW."""
    company = Company.objects.filter(id=company_id).first()
    if not company:
        raise ApiError("not_found", "Company record not found.", 404)

    verification = company.verifications.order_by("-submitted_at").first()
    if not verification:
        verification = CompanyVerification.objects.create(
            company=company,
            submitted_by=admin_user,
            designated_recruiter=company.admin_user,
            status=CompanyVerificationStatus.UNDER_REVIEW,
        )

    now = timezone.now()
    verification.status = CompanyVerificationStatus.UNDER_REVIEW
    verification.reviewed_by = admin_user
    company.verification_status = CompanyVerificationStatus.UNDER_REVIEW

    history = verification.review_history or []
    history.append({
        "action": "assigned_to_review",
        "timestamp": now.isoformat(),
        "by": admin_user.email,
        "admin_name": getattr(admin_user, "full_name", None) or admin_user.email,
    })
    verification.review_history = history

    verification.save(update_fields=["status", "reviewed_by", "review_history"])
    company.save(update_fields=["verification_status", "updated_at"])

    return company


@transaction.atomic
def approve_company_verification(company_id, admin_user, risk_score=None, risk_level=None):
    """Approve company verification and grant enterprise recruiting privileges."""
    company = Company.objects.filter(id=company_id).first()
    if not company:
        raise ApiError("not_found", "Company record not found.", 404)

    verification = company.verifications.order_by("-submitted_at").first()
    if not verification:
        raise ApiError("invalid_state", "No verification submission found to approve.", 400)

    now = timezone.now()
    verification.status = CompanyVerificationStatus.APPROVED
    verification.reviewed_by = admin_user
    verification.reviewed_at = now
    if risk_score is not None:
        verification.risk_score = risk_score
    if risk_level is not None:
        verification.risk_level = risk_level

    company.verification_status = CompanyVerificationStatus.APPROVED

    history = verification.review_history or []
    history.append({
        "action": "approved",
        "timestamp": now.isoformat(),
        "by": admin_user.email,
        "admin_name": getattr(admin_user, "full_name", None) or admin_user.email,
    })
    verification.review_history = history

    verification.save()
    company.save(update_fields=["verification_status", "updated_at"])

    return company


@transaction.atomic
def reject_company_verification(company_id, admin_user, rejection_reason):
    """Decline company verification with required compliance explanation."""
    company = Company.objects.filter(id=company_id).first()
    if not company:
        raise ApiError("not_found", "Company record not found.", 404)

    verification = company.verifications.order_by("-submitted_at").first()
    if not verification:
        raise ApiError("invalid_state", "No verification submission found to reject.", 400)

    now = timezone.now()
    verification.status = CompanyVerificationStatus.REJECTED
    verification.rejection_reason = rejection_reason
    verification.reviewed_by = admin_user
    verification.reviewed_at = now

    company.verification_status = CompanyVerificationStatus.REJECTED

    history = verification.review_history or []
    history.append({
        "action": "rejected",
        "timestamp": now.isoformat(),
        "by": admin_user.email,
        "admin_name": getattr(admin_user, "full_name", None) or admin_user.email,
        "reason": rejection_reason,
    })
    verification.review_history = history

    verification.save()
    company.save(update_fields=["verification_status", "updated_at"])

    return company


@transaction.atomic
def add_internal_note(company_id, admin_user, note_text):
    """Add private administrative review note."""
    company = Company.objects.filter(id=company_id).first()
    if not company:
        raise ApiError("not_found", "Company record not found.", 404)

    verification = company.verifications.order_by("-submitted_at").first()
    if not verification:
        raise ApiError("invalid_state", "No verification submission exists for this company.", 400)

    # Notes stored as JSON structure in internal_notes or formatted text
    existing = []
    if verification.internal_notes:
        try:
            existing = json.loads(verification.internal_notes)
        except Exception:
            existing = [{"note": verification.internal_notes, "author": "Admin", "timestamp": ""}]

    new_entry = {
        "author": getattr(admin_user, "full_name", None) or admin_user.email,
        "email": admin_user.email,
        "timestamp": timezone.now().isoformat(),
        "note": note_text.strip(),
    }
    existing.append(new_entry)
    verification.internal_notes = json.dumps(existing)
    verification.save(update_fields=["internal_notes"])

    return existing
