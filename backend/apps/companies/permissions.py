from rest_framework.permissions import BasePermission
from shared.constants.roles import Role
from .models import Company, CompanyVerificationStatus


class IsRecruiter(BasePermission):
    """Allows access only to authenticated recruiters (and super admins)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.RECRUITER
                or getattr(request.user, "role", "") == Role.SUPER_ADMIN
            )
        )


class IsVerifiedRecruiter(BasePermission):
    """
    Allows access only to recruiters whose associated company is APPROVED (or Super Admin).
    Gates upcoming job posting, applicant management, and candidate communication.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        role = getattr(request.user, "role", "")
        if role == Role.SUPER_ADMIN:
            return True

        if role != Role.RECRUITER:
            return False

        company = Company.objects.filter(admin_user=request.user).first()
        if not company:
            return False

        return company.verification_status == CompanyVerificationStatus.APPROVED
