from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenViewBase

from apps.companies.models import Company
from shared.constants.roles import Role
from shared.exceptions.api import ApiError

from . import services
from .models import User
from .permissions import IsSuperAdmin
from .serializers import (
    GoogleLoginSerializer,
    LoginSerializer,
    LogoutSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendOtpSerializer,
    UserSummarySerializer,
    VerifyOtpSerializer,
)


class PublicAPIView(APIView):
    """Open endpoints: no login needed, and a stale/bad token must not block them."""
    permission_classes = [AllowAny]
    authentication_classes = []


class RegisterView(PublicAPIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = {k: v for k, v in serializer.validated_data.items() if k != "accept_terms"}
        user = services.register_user(**data)
        return Response(
            {"user": UserSummarySerializer(user).data, "message": "Verification code sent to your email."},
            status=status.HTTP_201_CREATED,
        )


class VerifyOtpView(PublicAPIView):
    def post(self, request):
        serializer = VerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.verify_email_otp(**serializer.validated_data)
        return Response({"user": UserSummarySerializer(user).data, "message": "Email verified."})


class ResendOtpView(PublicAPIView):
    def post(self, request):
        serializer = ResendOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.resend_email_otp(**serializer.validated_data)
        return Response({"message": "If the account exists and is unverified, a new code has been sent."})


class LoginView(PublicAPIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, access, refresh = services.login(**serializer.validated_data)
        return Response({"access": access, "refresh": refresh, "user": MeSerializer(user).data})


class SuperAdminLoginView(PublicAPIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, access, refresh = services.login_super_admin(**serializer.validated_data)
        return Response({"access": access, "refresh": refresh, "user": MeSerializer(user).data})


class ActiveTokenRefreshSerializer(TokenRefreshSerializer):
    """simplejwt's refresh (rotation + blacklist of the old token) plus an account-state check,
    so a blocked or deleted user cannot mint new access tokens."""

    def validate(self, attrs):
        token = RefreshToken(attrs["refresh"])  # raises TokenError if invalid/expired/blacklisted
        user = User.objects.filter(pk=token[api_settings.USER_ID_CLAIM]).first()
        if user is None or not user.is_active:
            raise ApiError("account_disabled", "This account has been deleted or disabled.", 403)
        if user.suspended_at is not None:
            raise ApiError("account_suspended", "This account has been suspended.", 403)
        return super().validate(attrs)


class RefreshView(TokenViewBase):
    serializer_class = ActiveTokenRefreshSerializer


class LogoutView(APIView):
    """Needs a valid access token (default permission) plus the refresh token to blacklist."""

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.logout(user=request.user, refresh_token=serializer.validated_data["refresh"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)


class PasswordResetRequestView(PublicAPIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.request_password_reset(**serializer.validated_data)
        return Response({"message": "If an account exists for this email, password reset instructions have been sent."})


class PasswordResetConfirmView(PublicAPIView):
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.confirm_password_reset(**serializer.validated_data)
        return Response({"message": "Password updated successfully. Please log in."})


class GoogleLoginView(PublicAPIView):
    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, access, refresh, created = services.login_with_google(**serializer.validated_data)
        return Response(
            {"access": access, "refresh": refresh, "user": MeSerializer(user).data, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AdminDashboardStatsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_users = User.objects.count()
        candidates = User.objects.filter(role=Role.CANDIDATE.value).count()
        recruiters = User.objects.filter(role=Role.RECRUITER.value).count()
        companies = Company.objects.count()
        pending_verifications = Company.objects.filter(verification_status="PENDING").count()

        return Response({
            "total_users": total_users,
            "active_candidates": candidates,
            "active_recruiters": recruiters,
            "registered_companies": companies,
            "pending_verifications": pending_verifications,
        })
