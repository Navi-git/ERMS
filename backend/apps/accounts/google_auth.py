"""The only place that talks to Google. Everything else calls verify_id_token()."""
from django.conf import settings
from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from shared.exceptions.api import ApiError


def verify_id_token(token):
    """Verify a Google ID token (signature, expiry, issuer, audience) and return clean claims.

    The browser gets the token from Google; we never see the user's Google password.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise ApiError("google_not_configured", "Google sign-in is not configured.", 503)
    try:
        claims = google_id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except TransportError:
        raise ApiError("google_unavailable", "Could not reach Google. Try again shortly.", 503)
    except (ValueError, GoogleAuthError):
        raise ApiError("invalid_google_token", "Google sign-in failed. Please try again.", 401)

    email = (claims.get("email") or "").strip().lower()
    if not email or claims.get("email_verified") is not True:
        raise ApiError("google_email_unverified", "Your Google email address is not verified.", 400)
    return {
        "sub": str(claims["sub"]),
        "email": email,
        "name": (claims.get("name") or "").strip(),
        "picture": claims.get("picture") or None,
    }
