"""Daily log endpoints (docs/03 D1, D2)."""
from drf_spectacular.utils import OpenApiExample, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import visible_astronauts
from core.api import (
    ASTRONAUT_PARAM, FROM_PARAM, TO_PARAM, DateRangeSerializer, apply_date_range, astronaut_for, parse_query,
    required_value,
)
from core.schema import NOT_AUTHENTICATED, error_response
from scoring.vitals_rules import vitals_status

from .models import DailyLog
from .serializers import DailyLogSerializer

STATUS = inline_serializer("VitalStatus", {"level": serializers.CharField(), "text": serializers.CharField()})
SAVED = inline_serializer("DailyLogSaved", {
    **{name: field for name, field in DailyLogSerializer().get_fields().items()},
    "vitals_status": inline_serializer("VitalsStatus", {
        "heart": STATUS, "blood_pressure": STATUS, "sleep": STATUS, "mood": STATUS}),
})
FORBIDDEN = error_response("Not your data (crew), or read-only role (flight surgeon).", "PERMISSION_DENIED",
                           "You can't add data for this astronaut.")
LOG = {"id": 301, "astronaut": 1, "date": "2026-11-14", "mission_day": 92, "resting_hr_bpm": 64,
       "systolic_mmhg": 118, "diastolic_mmhg": 76, "sleep_hours": 6.0, "mood": 3, "sodium_mg": 3400,
       "exercise_min": 90, "created_at": "2026-11-14T07:02:11Z", "updated_at": "2026-11-14T07:02:11Z"}


def _with_status(log):
    data = DailyLogSerializer(log).data
    data["vitals_status"] = vitals_status(
        resting_hr_bpm=log.resting_hr_bpm, systolic_mmhg=log.systolic_mmhg, diastolic_mmhg=log.diastolic_mmhg,
        sleep_hours=log.sleep_hours, mood=log.mood,
    )
    return data


class DailyLogView(APIView):
    @extend_schema(
        tags=["Daily logs"], summary="Log today's vitals (create or update)",
        description=(
            "Upsert on (astronaut, date). First post for a date creates the log (201); later posts for the same "
            "date update only the fields you send (200). Every value is optional. The response adds "
            "`vitals_status`: GREEN/AMBER/RED/UNKNOWN + guidance for heart rate, blood pressure, sleep and mood."
        ),
        request=DailyLogSerializer,
        responses={200: SAVED, 201: SAVED, 400: error_response(
            "Out-of-range values.", "VALIDATION_ERROR", "Some fields are invalid.", {"mood": ["Must be between 1 and 5."]}),
            401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[
            OpenApiExample("Request (docs/03 D1)", request_only=True, value={
                k: LOG[k] for k in ("astronaut", "date", "resting_hr_bpm", "systolic_mmhg", "diastolic_mmhg",
                                    "sleep_hours", "mood", "sodium_mg", "exercise_min")}),
            OpenApiExample("Saved", response_only=True, value={**LOG, "vitals_status": {
                "heart": {"level": "GREEN", "text": "Resting heart rate 64 bpm: normal."},
                "blood_pressure": {"level": "GREEN", "text": "Blood pressure 118/76: normal."},
                "sleep": {"level": "AMBER", "text": "6.0 h sleep: below target. Try to protect your sleep window tonight."},
                "mood": {"level": "AMBER", "text": "Mood is lower than usual. Consider a talk with crew or family."}}}),
        ],
    )
    def post(self, request):
        astronaut_id = required_value(request.data, "astronaut", serializers.IntegerField(min_value=1))
        day = required_value(request.data, "date", serializers.DateField())
        astronaut = astronaut_for(request, astronaut_id, edit=True)
        existing = DailyLog.objects.filter(astronaut=astronaut, date=day).first()
        serializer = DailyLogSerializer(existing, data=request.data, partial=existing is not None)
        serializer.is_valid(raise_exception=True)
        log = serializer.save()
        return Response(_with_status(log), status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Daily logs"], summary="Daily log history",
        description="Oldest first. Without `astronaut`: everyone you may see (crew: only yourself).",
        parameters=[ASTRONAUT_PARAM, FROM_PARAM, TO_PARAM],
        responses={200: DailyLogSerializer(many=True), 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[OpenApiExample("History", response_only=True, value=[LOG])],
    )
    def get(self, request):
        filters = parse_query(DateRangeSerializer, request)
        logs = DailyLog.objects.order_by("astronaut_id", "date")
        if filters.get("astronaut"):
            logs = logs.filter(astronaut=astronaut_for(request, filters["astronaut"]))
        else:
            logs = logs.filter(astronaut__in=visible_astronauts(request.user))
        return Response(DailyLogSerializer(apply_date_range(logs, filters, "date"), many=True).data)
