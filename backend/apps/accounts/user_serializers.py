from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class UserProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)


class UserPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=128, required=False, allow_blank=True, write_only=True)
    new_password = serializers.CharField(max_length=128, required=True, write_only=True)


class AdminCreateSuperAdminSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(max_length=128, write_only=True)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class AdminSuspendUserSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, min_length=3, required=True)

