"""Permission classes for Jobs app."""
from rest_framework.permissions import BasePermission
from shared.constants.roles import Role


class IsRecruiterUser(BasePermission):
    """Allows access only to recruiters (and super admins)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.RECRUITER
                or getattr(request.user, "role", "") == Role.SUPER_ADMIN
                or getattr(request.user, "is_superuser", False)
            )
        )


class IsCandidateUser(BasePermission):
    """Allows access only to candidates (and super admins)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.CANDIDATE
                or getattr(request.user, "role", "") == Role.SUPER_ADMIN
                or getattr(request.user, "is_superuser", False)
            )
        )


class IsSuperAdminUser(BasePermission):
    """Allows access only to super admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.SUPER_ADMIN
                or getattr(request.user, "is_superuser", False)
            )
        )

