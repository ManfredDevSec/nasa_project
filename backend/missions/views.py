"""Mission + cabin log endpoints (docs/03 M1, E1, E2)."""
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsMedicalOfficer
from core.api import (
    FROM_PARAM, TO_PARAM, DateRangeSerializer, active_mission, apply_date_range, parse_query, required_value, users_mission,
)
from core.schema import NOT_AUTHENTICATED, error_response

from .models import CabinLog
from .serializers import CabinLogSerializer, MissionSerializer

NO_ACTIVE_MISSION = error_response("No mission is marked active.", "NO_ACTIVE_MISSION", "There is no active mission yet.")
FORBIDDEN = error_response("Only the Medical Officer (or an admin) can log cabin data.", "PERMISSION_DENIED", "Your role can't do this.")

MISSION_EXAMPLE = {"id": 1, "name": "Ares Transit 1", "environment": "TRANSIT", "gravity_g": 0.0,
                   "start_date": "2026-08-15", "mission_day_today": 92, "planned_duration_days": 900}
CABIN_EXAMPLE = {"id": 92, "mission": 1, "date": "2026-11-14", "mission_day": 92,
                 "co2_mmhg": 4.6, "temperature_c": 22.5, "humidity_pct": 45.0}


class ActiveMissionView(APIView):
    @extend_schema(
        tags=["Mission"], summary="Active mission + today's mission day",
        responses={200: MissionSerializer, 401: NOT_AUTHENTICATED, 409: NO_ACTIVE_MISSION},
        examples=[OpenApiExample("Active mission", value=MISSION_EXAMPLE, response_only=True)],
    )
    def get(self, request):
        return Response(MissionSerializer(active_mission()).data)


class CabinRangeSerializer(DateRangeSerializer):
    def get_fields(self):
        fields = super().get_fields()
        fields.pop("astronaut")
        return fields


class CabinLogView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsMedicalOfficer()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=["Cabin logs"], summary="Cabin CO₂ history",
        description="Your mission's cabin logs (the active mission for flight surgeons/admins), oldest first.",
        parameters=[FROM_PARAM, TO_PARAM],
        responses={200: CabinLogSerializer(many=True), 401: NOT_AUTHENTICATED, 409: NO_ACTIVE_MISSION},
        examples=[OpenApiExample("History", value=[CABIN_EXAMPLE], response_only=True)],
    )
    def get(self, request):
        filters = parse_query(CabinRangeSerializer, request)
        logs = apply_date_range(CabinLog.objects.filter(mission=users_mission(request.user)), filters, "date")
        return Response(CabinLogSerializer(logs.order_by("date"), many=True).data)

    @extend_schema(
        tags=["Cabin logs"], summary="Log cabin CO₂ for a day (create or update)",
        description=(
            "Upsert on (active mission, date): the first post for a date creates the log (201), later posts for "
            "the same date update the fields you send (200). Medical Officer or admin only."
        ),
        request=CabinLogSerializer,
        responses={200: CabinLogSerializer, 201: CabinLogSerializer, 400: error_response(
            "Invalid values.", "VALIDATION_ERROR", "Some fields are invalid.", {"co2_mmhg": ["Must be between 0 and 15."]}),
            401: NOT_AUTHENTICATED, 403: FORBIDDEN, 409: NO_ACTIVE_MISSION},
        examples=[
            OpenApiExample("Request", value={"date": "2026-11-14", "co2_mmhg": 4.6, "temperature_c": 22.5, "humidity_pct": 45},
                           request_only=True),
            OpenApiExample("Saved", value=CABIN_EXAMPLE, response_only=True),
        ],
    )
    def post(self, request):
        mission = active_mission()
        day = required_value(request.data, "date", serializers.DateField())
        existing = CabinLog.objects.filter(mission=mission, date=day).first()
        serializer = CabinLogSerializer(existing, data=request.data, partial=existing is not None)
        serializer.is_valid(raise_exception=True)
        log = serializer.save(mission=mission)
        return Response(CabinLogSerializer(log).data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)
