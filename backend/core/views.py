from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Used by Docker's health check and Render's health check path."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Health"],
        summary="Is the API up?",
        description="Checks the database and the cache. 200 when both answer, 503 otherwise. No login needed.",
        responses={
            (200, "application/json"): inline_serializer(
                "Health",
                {"status": serializers.CharField(), "database": serializers.CharField(), "cache": serializers.CharField()},
            ),
            (503, "application/json"): inline_serializer(
                "HealthDown",
                {"status": serializers.CharField(), "database": serializers.CharField(), "cache": serializers.CharField()},
            ),
        },
        examples=[OpenApiExample("Healthy", value={"status": "ok", "database": "ok", "cache": "ok"}, response_only=True)],
    )
    def get(self, request):
        checks = {"database": _check_database(), "cache": _check_cache()}
        healthy = all(v == "ok" for v in checks.values())
        return Response({"status": "ok" if healthy else "error", **checks}, status=200 if healthy else 503)


def _check_database():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return "ok"
    except Exception:
        return "error"


def _check_cache():
    try:
        cache.set("health:ping", "pong", 5)
        return "ok" if cache.get("health:ping") == "pong" else "error"
    except Exception:
        return "error"
