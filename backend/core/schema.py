"""Shared pieces for Swagger docs (@extend_schema) used by every app."""
from drf_spectacular.utils import OpenApiExample, OpenApiResponse
from rest_framework import serializers


class ErrorDetailSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    details = serializers.DictField()


class ErrorSerializer(serializers.Serializer):
    """Standard error body (docs/01 §5)."""

    error = ErrorDetailSerializer()


class MessageSerializer(serializers.Serializer):
    detail = serializers.CharField()


def error_response(description, code, message, details=None):
    """OpenApiResponse for one error case, with an example body."""
    return OpenApiResponse(
        response=ErrorSerializer,
        description=description,
        examples=[
            OpenApiExample(
                code,
                value={"error": {"code": code, "message": message, "details": details or {}}},
                response_only=True,
            )
        ],
    )


NOT_AUTHENTICATED = error_response(
    "Missing, wrong or expired token.",
    "NOT_AUTHENTICATED",
    "Authentication credentials were not provided.",
)
THROTTLED = error_response(
    "Too many attempts. Wait and try again.",
    "THROTTLED",
    "Request was throttled. Expected available in 42 seconds.",
)
