from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication, get_authorization_header

from .services import token_expired


class ExpiringTokenAuthentication(TokenAuthentication):
    """DRF token auth with two additions:

    - A token stops working AUTH_TOKEN_TTL_HOURS after login.
    - Both `Authorization: Token <key>` (spec) and `Authorization: Bearer <key>` work.
      Bearer is what Swagger's "Authorize" box sends, so there you paste only the key.
    """

    keywords = (b"token", b"bearer")

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() not in self.keywords:
            return None  # no token header: let other auth (session) try, else 401
        if len(auth) == 1:
            raise exceptions.AuthenticationFailed("Invalid token header. No token after the keyword.")
        if len(auth) > 2:
            raise exceptions.AuthenticationFailed("Invalid token header. The token must not contain spaces.")
        try:
            key = auth[1].decode()
        except UnicodeError:
            raise exceptions.AuthenticationFailed("Invalid token header. The token has invalid characters.")
        return self.authenticate_credentials(key)

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if token_expired(token):
            token.delete()
            raise exceptions.AuthenticationFailed("Your session has expired. Please log in again.")
        return user, token


class ExpiringTokenScheme(OpenApiAuthenticationExtension):
    """How Swagger shows our auth: an HTTP bearer box, so users paste the bare token."""

    target_class = ExpiringTokenAuthentication
    name = "tokenAuth"
    priority = 1  # wins over drf-spectacular's built-in TokenAuthentication scheme

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "description": (
                "Paste **only the token** from `POST /api/v1/auth/login/` (no prefix). "
                "Apps can send `Authorization: Token <token>` or `Authorization: Bearer <token>`."
            ),
        }
