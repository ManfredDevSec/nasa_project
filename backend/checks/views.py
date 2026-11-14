"""Vision check endpoints (docs/03 V1–V3)."""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import visible_astronauts
from core.api import (
    ASTRONAUT_PARAM, FROM_PARAM, TO_PARAM, DateRangeSerializer, apply_date_range, astronaut_for,
    check_edit_permission, parse_query,
)
from core.schema import NOT_AUTHENTICATED, error_response
from crew.serializers import BaselineSerializer
from scoring.serializers import AssessmentSerializer

from .models import VisionCheck
from .serializers import VisionCheckSerializer
from .services import submit_check

CHECK_WITH_ASSESSMENT = inline_serializer("CheckWithAssessment", {
    "check": VisionCheckSerializer(),
    "assessment": AssessmentSerializer(allow_null=True),
})
CHECK_HISTORY = inline_serializer("CheckHistory", {
    "check": VisionCheckSerializer(),
    "assessment": AssessmentSerializer(allow_null=True),
}, many=True)
SUBMIT_RESULT = inline_serializer("CheckSubmitResult", {
    "check": VisionCheckSerializer(),
    "assessment": AssessmentSerializer(allow_null=True),
    "baseline": BaselineSerializer(allow_null=True),
})
FORBIDDEN = error_response("Not your data (crew), or read-only role (flight surgeon).", "PERMISSION_DENIED",
                           "You don't have access to this astronaut's data.")
CHECK = {"id": 57, "astronaut": 1, "taken_at": "2026-11-14T09:30:00Z", "mission_day": 92, "is_baseline": False,
         "near_vision_left": 6, "near_vision_right": 8, "contrast_left": 5, "contrast_right": 6,
         "amsler_left": [[3, 4], [3, 5]], "amsler_right": [], "headache": 2, "eye_pressure": 1, "blur": 2,
         "distance_ok": True, "notes": "", "created_at": "2026-11-14T09:31:02Z"}
ASSESSMENT = {
    "id": 41, "level": "RED", "worse_eye": "LEFT", "near_drift_left": 2.0, "near_drift_right": 0.33,
    "contrast_drift_left": 1.0, "contrast_drift_right": 0.0, "symptom_score": 5,
    "new_amsler_left": True, "new_amsler_right": False,
    "reasons": ["Left eye near vision is 2 lines below your normal.", "Left eye contrast is 1 level below your normal.",
                "New wavy or missing area on the left-eye grid.", "You reported headache, eye pressure and blur (score 5/9)."],
    "actions": [{"code": "NOTIFY_MO_NOW", "text": "Tell the Crew Medical Officer now.", "priority": 1},
                {"code": "ESCALATE_EARTH", "text": "A priority note will go to the flight surgeon.", "priority": 1},
                {"code": "RETEST_48H", "text": "Retest within 48 hours.", "priority": 2},
                {"code": "CHECK_CO2", "text": "Ask for a CO₂ scrubber check.", "priority": 2},
                {"code": "LOG_SYMPTOMS", "text": "Note when the symptoms happen.", "priority": 3}],
    "env_insights": [{"factor": "CO2", "text": "This change followed 5 days of high cabin CO₂. This is a pattern we "
                      "noticed, not a proven cause.", "value": 4.6, "normal": 2.5}],
    "escalate_to_earth": True, "next_test_due": "2026-11-16",
}


def _pair(check):
    assessment = getattr(check, "assessment", None)
    return {"check": VisionCheckSerializer(check).data,
            "assessment": AssessmentSerializer(assessment).data if assessment else None}


class HistorySerializer(DateRangeSerializer):
    def get_fields(self):
        return {**super().get_fields(), "include_baseline": serializers.BooleanField(required=False, default=False)}


class VisionCheckListView(APIView):
    @extend_schema(
        tags=["Vision checks"], summary="Submit an eye test (scored or baseline)",
        description=(
            "Saves the test and, in the same step, either updates the astronaut's baseline (`is_baseline: true`, "
            "then `assessment` is null and `baseline` is filled) or scores it (`assessment` filled, `baseline` null). "
            "`taken_at`, `amsler_*`, `distance_ok`, `notes` are optional. Crew: own astronaut only; Medical "
            "Officer: whole crew; Flight surgeon: read-only."
        ),
        request=VisionCheckSerializer,
        responses={
            201: SUBMIT_RESULT,
            400: error_response("Out-of-range or malformed values.", "VALIDATION_ERROR", "Some fields are invalid.",
                                {"near_vision_left": ["Must be between 1 and 10."]}),
            401: NOT_AUTHENTICATED, 403: FORBIDDEN,
            409: error_response("Scored test before any baseline exists.", "NO_BASELINE",
                                "This astronaut has no baseline yet. Do the pre-flight baseline tests first."),
        },
        examples=[
            OpenApiExample("Scored test (docs/03 V1)", request_only=True, value={
                k: CHECK[k] for k in ("astronaut", "taken_at", "near_vision_left", "near_vision_right", "contrast_left",
                                      "contrast_right", "amsler_left", "amsler_right", "headache", "eye_pressure",
                                      "blur", "distance_ok", "notes")} | {"is_baseline": False}),
            OpenApiExample("Scored → RED", response_only=True, value={"check": CHECK, "assessment": ASSESSMENT, "baseline": None}),
        ],
    )
    def post(self, request):
        serializer = VisionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check_edit_permission(request, serializer.validated_data["astronaut"])
        check, assessment, baseline = submit_check(serializer.validated_data)
        return Response({
            "check": VisionCheckSerializer(check).data,
            "assessment": AssessmentSerializer(assessment).data if assessment else None,
            "baseline": BaselineSerializer(baseline).data if baseline else None,
        }, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Vision checks"], summary="Check history",
        description="`{check, assessment}` pairs, oldest first. Baseline checks only with `include_baseline=true`.",
        parameters=[ASTRONAUT_PARAM, FROM_PARAM, TO_PARAM,
                    OpenApiParameter("include_baseline", bool, description="Also list pre-flight baseline checks.")],
        responses={200: CHECK_HISTORY,
                   400: error_response("Bad filter.", "VALIDATION_ERROR", "Some fields are invalid.", {"from": ["Must be on or before 'to'."]}),
                   401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[OpenApiExample("History", response_only=True, value=[{"check": CHECK, "assessment": ASSESSMENT}])],
    )
    def get(self, request):
        filters = parse_query(HistorySerializer, request)
        checks = VisionCheck.objects.select_related("assessment").order_by("taken_at", "pk")
        if filters.get("astronaut"):
            checks = checks.filter(astronaut=astronaut_for(request, filters["astronaut"]))
        else:
            checks = checks.filter(astronaut__in=visible_astronauts(request.user))
        if not filters["include_baseline"]:
            checks = checks.filter(is_baseline=False)
        checks = apply_date_range(checks, filters, "taken_at__date")
        return Response([_pair(c) for c in checks])


class VisionCheckDetailView(APIView):
    @extend_schema(
        tags=["Vision checks"], summary="One check + its assessment",
        responses={200: CHECK_WITH_ASSESSMENT, 401: NOT_AUTHENTICATED, 403: FORBIDDEN,
                   404: error_response("No check with this id.", "NOT_FOUND", "Not found.")},
        examples=[OpenApiExample("Check", response_only=True, value={"check": CHECK, "assessment": ASSESSMENT})],
    )
    def get(self, request, pk):
        check = get_object_or_404(VisionCheck.objects.select_related("assessment", "astronaut"), pk=pk)
        astronaut_for(request, check.astronaut_id)
        return Response(_pair(check))
