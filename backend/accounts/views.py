"""Auth endpoints (docs/03 §1, A1–A6). Base: /api/v1/auth/"""
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db.models import Q
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.schema import NOT_AUTHENTICATED, THROTTLED, MessageSerializer, error_response
from sightline.exceptions import BadRequestError

from . import services
from .models import User
from .permissions import IsAdmin
from .serializers import (
    AdminUserSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    TokenSerializer,
    UserSerializer,
)

TAGS = ["Auth"]

USER_EXAMPLE = {
    "id": 2,
    "username": "osei",
    "role": "CREW",
    "display_name": "Cmdr. Ama Osei",
    "astronaut_id": 1,
    "email": "osei@example.com",
    "first_name": "Ama",
    "last_name": "Osei",
}

VALIDATION_EXAMPLE = error_response(
    "Some fields are missing or invalid.",
    "VALIDATION_ERROR",
    "Some fields are invalid.",
    {"new_password": ["This password is too short. It must contain at least 8 characters."]},
)


class PublicAuthView(APIView):
    """No login needed, and rate-limited (AUTH_THROTTLE_RATE) against password guessing.
    No authentication classes, so a stale token or admin session can't block these."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class LoginView(PublicAuthView):
    @extend_schema(
        tags=TAGS,
        summary="Log in (get a token)",
        description=(
            "Send username + password, get a token. Send it on every other request as "
            "`Authorization: Token <token>`. Tokens expire after `AUTH_TOKEN_TTL_HOURS` "
            "(default 7 days); logging in again while still valid returns the same token."
        ),
        request=LoginSerializer,
        responses={
            200: LoginResponseSerializer,
            400: error_response("Wrong username or password.", "INVALID_CREDENTIALS", "Wrong username or password."),
            429: THROTTLED,
        },
        examples=[
            OpenApiExample("Request", value={"username": "osei", "password": "sightline-demo"}, request_only=True),
            OpenApiExample(
                "Success",
                value={"token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b", "user": USER_EXAMPLE},
                response_only=True,
            ),
        ],
    )
    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(request, **data.validated_data)
        if user is None:  # also covers inactive accounts
            raise BadRequestError("Wrong username or password.", code="INVALID_CREDENTIALS")
        token = services.get_or_refresh_token(user)
        update_last_login(None, user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=TAGS,
        summary="Log out",
        description="Deletes your token, so it stops working on every device.",
        request=None,
        responses={204: OpenApiResponse(description="Logged out."), 401: NOT_AUTHENTICATED},
    )
    def post(self, request):
        services.revoke_tokens(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=TAGS,
        summary="Current user",
        description="Who is logged in, their role, and their linked astronaut (null for flight surgeons).",
        responses={200: UserSerializer, 401: NOT_AUTHENTICATED},
        examples=[OpenApiExample("Crew member", value=USER_EXAMPLE, response_only=True)],
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(
        tags=TAGS,
        summary="Update my profile",
        description="Change your email, first name or last name. Everything else is read-only.",
        request=UserSerializer,
        responses={200: UserSerializer, 400: VALIDATION_EXAMPLE, 401: NOT_AUTHENTICATED},
        examples=[OpenApiExample("Set email", value={"email": "osei@example.com"}, request_only=True)],
    )
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        tags=TAGS,
        summary="Change password",
        description=(
            "Needs your current password. On success all your old tokens stop working "
            "and you get a **new token** in the response. Save it and use it from now on."
        ),
        request=PasswordChangeSerializer,
        responses={200: TokenSerializer, 400: VALIDATION_EXAMPLE, 401: NOT_AUTHENTICATED, 429: THROTTLED},
        examples=[
            OpenApiExample(
                "Request",
                value={"old_password": "sightline-demo", "new_password": "a-much-better-passphrase"},
                request_only=True,
            )
        ],
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        token = services.rotate_token(user)
        return Response({"token": token.key})


class PasswordResetRequestView(PublicAuthView):
    @extend_schema(
        tags=TAGS,
        summary="Forgot password: email a reset link",
        description=(
            "Always answers 200, even if no account has this email, so nobody can probe which "
            "emails exist. The email links to `FRONTEND_URL/reset-password?uid=...&token=...`. "
            "The frontend reads `uid` and `token` from the link and calls `password/reset/confirm/`. "
            "Locally the email is printed in the backend console instead of being sent."
        ),
        request=PasswordResetRequestSerializer,
        responses={200: MessageSerializer, 400: VALIDATION_EXAMPLE, 429: THROTTLED},
        examples=[
            OpenApiExample("Request", value={"email": "osei@example.com"}, request_only=True),
            OpenApiExample(
                "Response",
                value={"detail": "If an account uses that email, we sent a link to reset the password."},
                response_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.send_password_reset_email(serializer.validated_data["email"])
        return Response({"detail": "If an account uses that email, we sent a link to reset the password."})


class PasswordResetConfirmView(PublicAuthView):
    @extend_schema(
        tags=TAGS,
        summary="Forgot password: set the new password",
        description=(
            "Send `uid` and `token` from the reset link plus the new password. The link works once "
            "and expires after `PASSWORD_RESET_TIMEOUT` (default 1 hour). Old tokens stop working; "
            "the user logs in again with the new password."
        ),
        request=PasswordResetConfirmSerializer,
        responses={
            200: MessageSerializer,
            400: error_response(
                "Bad or expired link, or weak password.",
                "VALIDATION_ERROR",
                "Some fields are invalid.",
                {"token": ["This reset link is invalid or has expired."]},
            ),
            429: THROTTLED,
        },
        examples=[
            OpenApiExample(
                "Request",
                value={"uid": "Mg", "token": "c9x1k2-5f0e3c1d2b4a6978", "new_password": "a-much-better-passphrase"},
                request_only=True,
            ),
            OpenApiExample("Response", value={"detail": "Password updated. Please log in."}, response_only=True),
        ],
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        services.revoke_tokens(user)
        return Response({"detail": "Password updated. Please log in."})


# --- User management (ADMIN only) ------------------------------------------

USERS_TAGS = ["Users (admin)"]
FORBIDDEN = error_response("Only admins can manage users.", "PERMISSION_DENIED", "Your role can't do this.")
ADMIN_USER_EXAMPLE = {
    **USER_EXAMPLE, "is_active": True, "last_login": "2026-11-14T09:30:00Z", "date_joined": "2026-08-01T10:00:00Z",
}


@extend_schema_view(
    list=extend_schema(
        tags=USERS_TAGS,
        summary="List users",
        parameters=[
            OpenApiParameter("role", str, enum=[r.value for r in User.Role], description="Only this role."),
            OpenApiParameter("is_active", bool, description="true = active accounts, false = deactivated."),
            OpenApiParameter("search", str, description="Part of username, name or email."),
        ],
        responses={200: AdminUserSerializer(many=True), 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
    ),
    retrieve=extend_schema(
        tags=USERS_TAGS, summary="One user",
        responses={200: AdminUserSerializer, 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
    ),
    create=extend_schema(
        tags=USERS_TAGS,
        summary="Create a user",
        description=(
            "Give a `password` to set it directly, **or** leave it out and give an `email`: the user then "
            "gets an invite email with a link to choose their password (same page as password reset). "
            "CREW and MEDICAL_OFFICER need an `astronaut_id`; FLIGHT_SURGEON must not have one; "
            "an astronaut can have only one account."
        ),
        responses={201: AdminUserSerializer, 400: VALIDATION_EXAMPLE, 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[
            OpenApiExample(
                "Invite a crew member",
                value={"username": "osei", "role": "CREW", "astronaut_id": 1, "email": "osei@example.com",
                       "first_name": "Ama", "last_name": "Osei"},
                request_only=True,
            ),
            OpenApiExample(
                "Flight surgeon with a password",
                value={"username": "surgeon", "role": "FLIGHT_SURGEON", "first_name": "Yaw",
                       "last_name": "Boateng", "password": "a-strong-passphrase"},
                request_only=True,
            ),
            OpenApiExample("Created", value=ADMIN_USER_EXAMPLE, response_only=True),
        ],
    ),
    partial_update=extend_schema(
        tags=USERS_TAGS,
        summary="Edit a user",
        description=(
            "Change any field. Setting `password` or `is_active: false` logs the user out everywhere. "
            "Send `is_active: true` to re-enable a deactivated account."
        ),
        responses={200: AdminUserSerializer, 400: VALIDATION_EXAMPLE, 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[OpenApiExample("Make medical officer", value={"role": "MEDICAL_OFFICER"}, request_only=True)],
    ),
    destroy=extend_schema(
        tags=USERS_TAGS,
        summary="Deactivate a user",
        description=(
            "Does **not** delete anything: the account is switched off (`is_active: false`) and logged out. "
            "The astronaut's health data is untouched. Re-enable with PATCH `is_active: true`."
        ),
        responses={204: OpenApiResponse(description="Deactivated."), 400: VALIDATION_EXAMPLE,
                   401: NOT_AUTHENTICATED, 403: FORBIDDEN},
    ),
)
class UserAdminViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = User.objects.select_related("astronaut").order_by("id")
        params = self.request.query_params
        if role := params.get("role"):
            qs = qs.filter(role=role.upper())
        if (active := params.get("is_active")) in {"true", "false"}:
            qs = qs.filter(is_active=(active == "true"))
        if search := params.get("search"):
            qs = qs.filter(
                Q(username__icontains=search) | Q(first_name__icontains=search)
                | Q(last_name__icontains=search) | Q(email__icontains=search)
            )
        return qs

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            raise BadRequestError("You can't deactivate your own account.", code="VALIDATION_ERROR")
        user.is_active = False
        user.save(update_fields=["is_active"])
        services.revoke_tokens(user)
        return Response(status=status.HTTP_204_NO_CONTENT)
