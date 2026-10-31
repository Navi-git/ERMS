from rest_framework.permissions import BasePermission
from shared.constants.roles import Role


class IsSuperAdmin(BasePermission):
    """Allows access only to authenticated super admin users."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.SUPER_ADMIN
        )

