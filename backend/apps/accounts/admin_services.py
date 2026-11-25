"""Super admin user management services (Module 2).

Enforces strict safety rules:
1. Super admin cannot suspend or delete themselves.
2. Super admin cannot suspend or delete another super admin.
3. Suspension reasons are captured in audit_logs.details.
"""
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone

from apps.companies.models import Company
from shared.constants.roles import Role
from shared.exceptions.api import ApiError

from .audit import record_audit_log
from .models import AuditLog, User, UserSecurity
from .services import revoke_all_sessions


def list_users(
    *,
    search=None,
    role=None,
    status=None,
    ordering="-created_at",
    page=1,
    page_size=10,
):
    """Return paginated users and summary stats for the admin users portal."""
    qs = User.objects.all()

    # Search by full name or email
    if search and search.strip():
        s = search.strip()
        qs = qs.filter(Q(email__icontains=s) | Q(full_name__icontains=s))

    # Role filter
    if role and role.strip() and role.lower() != "all":
        qs = qs.filter(role=role.strip().lower())

    # Status filter: 'active', 'pending', 'blocked'/'suspended', 'deleted'
    if status and status.strip() and status.lower() != "all":
        st = status.strip().lower()
        if st in ["active"]:
            qs = qs.filter(is_active=True, suspended_at__isnull=True, is_email_verified=True)
        elif st in ["pending"]:
            qs = qs.filter(is_active=True, is_email_verified=False)
        elif st in ["blocked", "suspended"]:
            qs = qs.filter(suspended_at__isnull=False)
        elif st in ["deleted"]:
            qs = qs.filter(is_active=False)

    # Ordering
    allowed_orderings = ["created_at", "-created_at", "email", "-email", "full_name", "-full_name"]
    if ordering not in allowed_orderings:
        ordering = "-created_at"
    qs = qs.order_by(ordering)

    # Calculate overall stats for the top cards in Figma
    stats = {
        "total_users": User.objects.count(),
        "candidates": User.objects.filter(role=Role.CANDIDATE.value).count(),
        "recruiters": User.objects.filter(role=Role.RECRUITER.value).count(),
        "admins": User.objects.filter(role=Role.SUPER_ADMIN.value).count(),
        "suspended": User.objects.filter(suspended_at__isnull=False).count(),
    }

    paginator = Paginator(qs, max(1, min(page_size, 100)))
    page_obj = paginator.get_page(page)

    results = []
    for u in page_obj.object_list:
        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "profile_picture_url": u.profile_picture_url,
            "is_active": u.is_active,
            "is_email_verified": u.is_email_verified,
            "is_suspended": u.suspended_at is not None,
            "suspended_at": u.suspended_at,
            "created_at": u.created_at,
        })

    return {
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "stats": stats,
        "results": results,
    }


def get_user_detail(*, user_id):
    """Return full user details, security metadata, company info, and recent audit logs."""
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise ApiError("user_not_found", "User not found.", 404)

    security = UserSecurity.objects.filter(user=user).first()
    company = None
    candidate_profile = None
    if user.role == Role.CANDIDATE.value:
        try:
            from apps.candidates.models import CandidateProfile
            cp = CandidateProfile.objects.filter(user=user).first()
            if cp:
                resumes = list(
                    cp.resumes.filter(archived_at__isnull=True)
                    .order_by("-is_default", "-uploaded_at")
                    .values("id", "title", "file_name", "file_size", "is_default", "uploaded_at")
                )
                candidate_profile = {
                    "id": cp.id,
                    "headline": cp.headline,
                    "summary": cp.summary,
                    "current_location": cp.current_location,
                    "seeking_status": cp.seeking_status,
                    "expected_salary_min": cp.expected_salary_min,
                    "expected_salary_max": cp.expected_salary_max,
                    "currency": cp.currency,
                    "work_authorization_status": cp.work_authorization_status,
                    "willing_to_relocate": cp.willing_to_relocate,
                    "linkedin_url": cp.linkedin_url,
                    "github_url": cp.github_url,
                    "portfolio_url": cp.portfolio_url,
                    "resumes": resumes,
                }
        except Exception:
            candidate_profile = None
    if user.role == Role.RECRUITER.value:
        comp = Company.objects.filter(admin_user=user).first()
        if comp:
            company = {
                "id": comp.id,
                "name": comp.name,
                "verification_status": comp.verification_status,
                "created_at": comp.created_at,
            }

    # Fetch recent audit actions affecting this user
    recent_logs = list(
        AuditLog.objects.filter(entity_type="user", entity_id=user.id)
        .order_by("-created_at")[:10]
        .values("id", "action", "details", "actor_type", "ip_address", "created_at")
    )

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role,
            "profile_picture_url": user.profile_picture_url,
            "is_active": user.is_active,
            "is_email_verified": user.is_email_verified,
            "suspended_at": user.suspended_at,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
        },
        "security": {
            "two_fa_enabled": security.two_fa_enabled if security else False,
            "failed_login_count": security.failed_login_count if security else 0,
            "locked_until": security.locked_until if security else None,
            "password_last_changed_at": security.password_last_changed_at if security else None,
        },
        "company": company,
        "candidate_profile": candidate_profile,
        "recent_activity": recent_logs,
    }


def suspend_user(*, admin_user, user_id, reason, request=None):
    """Suspend a user with safety rules and capture reason in audit_logs."""
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise ApiError("user_not_found", "User not found.", 404)

    if target.id == admin_user.id:
        raise ApiError("cannot_suspend_self", "You cannot suspend your own administrator account.", 400)

    if target.role == Role.SUPER_ADMIN.value:
        raise ApiError("cannot_suspend_superadmin", "Super Administrator accounts cannot be suspended.", 400)

    if not reason or not reason.strip():
        raise ApiError("reason_required", "A reason is required to suspend a user.", 400)

    now = timezone.now()
    target.suspended_at = now
    target.suspended_by = admin_user
    target.save(update_fields=["suspended_at", "suspended_by", "updated_at"])

    revoke_all_sessions(target)

    record_audit_log(
        actor=admin_user,
        action="user_suspended",
        entity_type="user",
        entity_id=target.id,
        details={"reason": reason.strip()},
        request=request,
    )

    return {"message": f"User {target.email} has been suspended."}


def reactivate_user(*, admin_user, user_id, request=None):
    """Reactivate a suspended user."""
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise ApiError("user_not_found", "User not found.", 404)

    if target.suspended_at is None:
        return {"message": "User is already active."}

    target.suspended_at = None
    target.suspended_by = None
    target.save(update_fields=["suspended_at", "suspended_by", "updated_at"])

    record_audit_log(
        actor=admin_user,
        action="user_reactivated",
        entity_type="user",
        entity_id=target.id,
        request=request,
    )

    return {"message": f"User {target.email} has been reactivated."}


def soft_delete_user(*, admin_user, user_id, request=None):
    """Soft-delete a user with safety rules."""
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise ApiError("user_not_found", "User not found.", 404)

    if target.id == admin_user.id:
        raise ApiError("cannot_delete_self", "You cannot delete your own administrator account.", 400)

    if target.role == Role.SUPER_ADMIN.value:
        raise ApiError("cannot_delete_superadmin", "Super Administrator accounts cannot be deleted.", 400)

    target.is_active = False
    target.save(update_fields=["is_active", "updated_at"])

    revoke_all_sessions(target)

    record_audit_log(
        actor=admin_user,
        action="user_soft_deleted",
        entity_type="user",
        entity_id=target.id,
        request=request,
    )

    return {"message": f"User {target.email} has been deactivated."}


def restore_user(*, admin_user, user_id, request=None):
    """Restore a soft-deleted user."""
    target = User.objects.filter(id=user_id).first()
    if not target:
        raise ApiError("user_not_found", "User not found.", 404)

    target.is_active = True
    target.save(update_fields=["is_active", "updated_at"])

    record_audit_log(
        actor=admin_user,
        action="user_restored",
        entity_type="user",
        entity_id=target.id,
        request=request,
    )

    return {"message": f"User {target.email} has been restored."}


def create_super_admin(*, admin_user, email, password, full_name, request=None):
    """Create a new Super Admin account."""
    clean_email = email.strip().lower()
    if User.objects.filter(email=clean_email).exists():
        raise ApiError("email_already_registered", "An account with this email already exists.", 409)

    new_admin = User.objects.create_superuser(
        email=clean_email,
        password=password,
        full_name=full_name.strip(),
    )
    UserSecurity.objects.create(user=new_admin)

    record_audit_log(
        actor=admin_user,
        action="superadmin_created",
        entity_type="user",
        entity_id=new_admin.id,
        details={"created_email": clean_email},
        request=request,
    )

    return new_admin

