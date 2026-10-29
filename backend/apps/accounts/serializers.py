from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.companies.models import Company
from shared.constants.roles import Role

from .models import User

REGISTRABLE_ROLES = [Role.CANDIDATE.value, Role.RECRUITER.value]  # super_admin is never self-registered


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})
    role = serializers.ChoiceField(choices=REGISTRABLE_ROLES)
    full_name = serializers.CharField(max_length=255, required=False)
    company_name = serializers.CharField(max_length=255, required=False)
    accept_terms = serializers.BooleanField()

    def validate_email(self, value):
        return value.strip().lower()

    def validate_accept_terms(self, value):
        if value is not True:
            raise serializers.ValidationError("You must accept the terms and privacy policy.")
        return value

    def validate(self, attrs):
        role = attrs["role"]
        if role == Role.CANDIDATE and not attrs.get("full_name"):
            raise serializers.ValidationError({"full_name": "This field is required."})
        if role == Role.RECRUITER and not attrs.get("company_name"):
            raise serializers.ValidationError({"company_name": "This field is required."})
        try:
            validate_password(attrs["password"], user=User(email=attrs["email"], full_name=attrs.get("full_name", "")))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs


class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "Enter the 6-digit code."})


class ResendOtpSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_email_verified"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    """Everything the frontend needs after login. Recruiters also get their company's
    verification status, which decides which tabs are locked."""

    company = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "role", "phone", "profile_picture_url",
            "is_email_verified", "last_login_at", "company",
        ]

    def get_company(self, user):
        if user.role != Role.RECRUITER:
            return None
        company = Company.objects.filter(admin_user=user).first()
        if company is None:
            return None
        return {"id": company.id, "name": company.name, "verification_status": company.verification_status}


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "Enter the 6-digit code."})
    new_password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        user = User.objects.filter(email=attrs["email"].strip().lower()).first()  # None is fine
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField(max_length=4096, write_only=True)
    accept_terms = serializers.BooleanField(required=False, default=False)
