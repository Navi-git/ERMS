from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import UserSecurity


class ActiveJWTAuthentication(JWTAuthentication):
    """JWT auth that re-checks the database on every request.

    An access token is valid for 15 minutes, so without these checks a user blocked,
    soft-deleted, or who just reset their password could keep using old tokens until they expire.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not user.is_active:
            raise AuthenticationFailed("Account disabled.", code="account_disabled")
        if user.suspended_at is not None:
            raise AuthenticationFailed("Account suspended.", code="account_suspended")

        changed_at = (
            UserSecurity.objects.filter(user=user)
            .values_list("password_last_changed_at", flat=True)
            .first()
        )
        if changed_at is not None and validated_token.get("iat", 0) < int(changed_at.timestamp()):
            raise AuthenticationFailed("Password changed. Please log in again.", code="password_changed")
        return user
