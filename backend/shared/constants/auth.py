class OtpPurpose:
    """Proposed values for otp_verifications.purpose (the ERD does not define them)."""
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class AuthProvider:
    """Proposed values for auth_identities.provider."""
    GOOGLE = "google"
    LINKEDIN = "linkedin"
