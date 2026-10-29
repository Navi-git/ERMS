
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from shared.constants.roles import Role


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)  
        else:
            user.set_unusable_password() 
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.CANDIDATE)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        if not password:
            raise ValueError("A superuser needs a password.")
        extra_fields["role"] = Role.SUPER_ADMIN
        extra_fields.setdefault("is_email_verified", True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser):

    password = models.CharField(max_length=255, db_column="password_hash", null=True, blank=True)
    last_login = None  
    role = models.CharField(max_length=30, choices=Role.choices)
    email = models.EmailField(max_length=255, unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True, blank=True)
    profile_picture_url = models.CharField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=30, null=True, blank=True)
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    privacy_version = models.CharField(max_length=30, null=True, blank=True)

    last_login_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
        db_column="suspended_by",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["role"], name="users_role_idx")]
       

    def __str__(self):
        return self.email

    
    @property
    def is_staff(self):
        return self.is_active and self.role == Role.SUPER_ADMIN

    def has_perm(self, perm, obj=None):
        return self.is_staff

    def has_module_perms(self, app_label):
        return self.is_staff


class UserSecurity(models.Model):


    user = models.OneToOneField(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="security"
    )
    two_fa_enabled = models.BooleanField(default=False)
    password_last_changed_at = models.DateTimeField(null=True, blank=True)
    failed_login_count = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_security"


class OtpVerification(models.Model):

    user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="otp_verifications"
    )
    destination = models.CharField(max_length=255)
    purpose = models.CharField(max_length=40)
    otp_code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "otp_verifications"


class AuthIdentity(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="auth_identities")
    provider = models.CharField(max_length=30)
    provider_user_id = models.CharField(max_length=255)
    provider_email = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "auth_identities"