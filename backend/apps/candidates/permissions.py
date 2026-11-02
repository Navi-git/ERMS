"""Permission classes for Candidate and Recruiter access."""
from rest_framework.permissions import BasePermission
from shared.constants.roles import Role


class IsCandidateUser(BasePermission):
    """Allows access only to candidate users (or super admin)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.CANDIDATE
                or getattr(request.user, "role", "") == Role.SUPER_ADMIN
            )
        )


class IsRecruiterUser(BasePermission):
    """Allows access to recruiters and super admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                getattr(request.user, "role", "") == Role.RECRUITER
                or getattr(request.user, "role", "") == Role.SUPER_ADMIN
            )
        )
