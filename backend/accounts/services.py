"""Auth logic kept out of views: tokens and password reset emails."""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.authtoken.models import Token

User = get_user_model()


# --- API tokens (one per user) ---------------------------------------------

def token_expired(token):
    return timezone.now() >= token.created + timedelta(hours=settings.AUTH_TOKEN_TTL_HOURS)


def get_or_refresh_token(user):
    """Token for login: reuse a still-valid one, replace an expired one."""
    token, created = Token.objects.get_or_create(user=user)
    if not created and token_expired(token):
        token.delete()
        token = Token.objects.create(user=user)
    return token


def revoke_tokens(user):
    """Log the user out everywhere."""
    Token.objects.filter(user=user).delete()


def rotate_token(user):
    revoke_tokens(user)
    return Token.objects.create(user=user)


# --- Password reset by email -----------------------------------------------

def make_reset_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.FRONTEND_URL.rstrip('/')}{settings.PASSWORD_RESET_PATH}?uid={uid}&token={token}"


def send_password_reset_email(email):
    """Email a reset link to every active account with this address.

    Silent when no account matches, so callers can't learn which emails exist.
    The link works once and expires after PASSWORD_RESET_TIMEOUT seconds.
    """
    # Includes invited users who never set a password (we have no external logins).
    users = User.objects.filter(email__iexact=email, is_active=True)
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60
    for user in users:
        send_mail(
            subject="SightLine: reset your password",
            message=(
                f"Hello {user.display_name},\n\n"
                "Someone asked to reset the password for your SightLine account "
                f"({user.username}).\n\n"
                f"Open this link to choose a new password (valid for {minutes} minutes):\n"
                f"{make_reset_link(user)}\n\n"
                "If this wasn't you, ignore this email. Your password won't change."
            ),
            from_email=None,  # DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
        )


def send_invite_email(user):
    """New account created by an admin without a password: email a link to set one.
    Same link + confirm endpoint as password reset."""
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60
    send_mail(
        subject="SightLine: your new account",
        message=(
            f"Hello {user.display_name},\n\n"
            f"An admin created a SightLine account for you. Your username is: {user.username}\n\n"
            f"Open this link to choose your password (valid for {minutes} minutes):\n"
            f"{make_reset_link(user)}\n\n"
            "If the link has expired, use \"Forgot password\" on the login page with this email address."
        ),
        from_email=None,
        recipient_list=[user.email],
    )


def user_from_reset_link(uid, token):
    """User for a valid (uid, token) pair from the reset link, else None."""
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None
    return user if default_token_generator.check_token(user, token) else None
