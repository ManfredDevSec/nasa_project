"""Report endpoints (docs/03 R1; R2–R5 come in T10/T11)."""
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import astronaut_for, parse_query, today
from core.schema import NOT_AUTHENTICATED, error_response
from scoring import config

from . import services

PART = inline_serializer("BodyMapPart", {
    "part": serializers.ChoiceField(choices=["EYES", "HEART", "SLEEP", "MIND"]),
    "level": serializers.ChoiceField(choices=["GREEN", "AMBER", "RED", "UNKNOWN"]),
    "summary": serializers.CharField(),
    "guidance": serializers.CharField(allow_null=True),
    "last_updated": serializers.DateTimeField(allow_null=True),
    "info": inline_serializer("BodyMapInfo", {
        "function": serializers.CharField(), "space_effect": serializers.CharField(), "what_to_do": serializers.CharField()}),
    "action": inline_serializer("BodyMapAction", {"label": serializers.CharField(), "route": serializers.CharField()}),
    "read_more_url": serializers.URLField(),
})
BODY_MAP = inline_serializer("BodyMap", {
    "astronaut_id": serializers.IntegerField(),
    "mission_day": serializers.IntegerField(),
    "as_of": serializers.DateField(),
    "parts": serializers.ListField(child=PART),
})

EXAMPLE = {
    "astronaut_id": 1, "mission_day": 92, "as_of": "2026-11-14",
    "parts": [
        {"part": "EYES", "level": "RED",
         "summary": "Left eye near vision is 2 lines below your normal. Test again by 15 Nov.",
         "guidance": "Tell the Crew Medical Officer now.", "last_updated": "2026-11-13T08:41:00Z",
         "info": {"function": "Your eyes focus light so you can see near and far.",
                  "space_effect": "In weightlessness, body fluids such as blood and cerebrospinal fluid move toward the head. "
                                  "This can cause swelling of the optic nerve and folds in the retina. NASA calls this "
                                  "Spaceflight Associated Neuro-ocular Syndrome (SANS).",
                  "what_to_do": "Do the weekly eye test. Report blur or headaches early."},
         "action": {"label": "Start eye test", "route": "/test"},
         "read_more_url": "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"},
        {"part": "HEART", "level": "GREEN", "summary": "HR 64, BP 118/76", "guidance": "Resting heart rate 64 bpm: normal.",
         "last_updated": "2026-11-14T00:00:00Z", "info": {"...": "..."}, "action": {"label": "Log today's vitals", "route": "/vitals"},
         "read_more_url": "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/"},
        {"part": "SLEEP", "level": "AMBER", "summary": "6.0 h last night", "guidance": "6.0 h sleep: below target. ...",
         "last_updated": "2026-11-14T00:00:00Z", "info": {"...": "..."}, "action": {"label": "Log today's vitals", "route": "/vitals"},
         "read_more_url": "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"},
        {"part": "MIND", "level": "UNKNOWN", "summary": "No mood logged yet.", "guidance": None, "last_updated": None,
         "info": {"...": "..."}, "action": {"label": "Log today's vitals", "route": "/vitals"},
         "read_more_url": "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/"},
    ],
}


class AsOfSerializer(serializers.Serializer):
    as_of = serializers.DateField(required=False)


class BodyMapView(APIView):
    @extend_schema(
        tags=["Reports"], summary="Body map (eyes, heart, sleep, mind)",
        description=(
            "Status + info card per part. EYES = latest eye assessment; HEART = worse of heart rate and blood "
            "pressure; SLEEP / MIND from the most recent daily log that has them. No data → `UNKNOWN`. "
            "`as_of` (default today) shows the map as it was on that date, using only data up to then."
        ),
        parameters=[OpenApiParameter("as_of", str, description="YYYY-MM-DD. Default: today.")],
        responses={200: BODY_MAP, 400: error_response("Bad date.", "VALIDATION_ERROR", "Some fields are invalid.",
                                                       {"as_of": ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."]}),
                   401: NOT_AUTHENTICATED,
                   403: error_response("Crew can only see their own body map.", "PERMISSION_DENIED",
                                       "You don't have access to this astronaut's data.")},
        examples=[OpenApiExample("Osei", value=EXAMPLE, response_only=True)],
    )
    def get(self, request, pk):
        astronaut = astronaut_for(request, pk)
        as_of = parse_query(AsOfSerializer, request).get("as_of") or today()
        return Response(services.body_map(astronaut, as_of))


# --- T10 ----------------------------------------------------------------------------

class TrendsQuerySerializer(AsOfSerializer):
    days = serializers.IntegerField(required=False, min_value=1, max_value=config.TRENDS_MAX_DAYS,
                                    default=config.TRENDS_DEFAULT_DAYS)


VISION_POINT = {"date": "2026-11-13", "mission_day": 91, "near_vision_left": 6, "near_vision_right": 8,
                "contrast_left": 5, "contrast_right": 6, "level": "RED"}
TRENDS_EXAMPLE = {
    "astronaut_id": 1, "period": {"from": "2026-08-17", "to": "2026-11-14", "days": 90},
    "baseline": {"near_vision_left": 8.0, "near_vision_right": 8.33, "contrast_left": 6.0, "contrast_right": 6.0},
    "vision": [{"date": "2026-08-21", "mission_day": 7, "near_vision_left": 8, "near_vision_right": 8,
                "contrast_left": 6, "contrast_right": 6, "level": "GREEN"}, VISION_POINT],
    "cabin_co2": [{"date": "2026-11-01", "mission_day": 79, "co2_mmhg": 4.62}],
    "daily": [{"date": "2026-11-14", "mission_day": 92, "sodium_mg": 3900, "exercise_min": 62, "sleep_hours": 7.5,
               "mood": 5, "resting_hr_bpm": 60, "systolic_mmhg": 116, "diastolic_mmhg": 73}],
    "events": [{"mission_day": 78, "type": "CO2_HIGH_START", "text": "Cabin CO₂ above normal"},
               {"mission_day": 89, "type": "CO2_HIGH_END", "text": "Cabin CO₂ back to normal"},
               {"mission_day": 91, "type": "ESCALATED", "text": "Red result: sent to the flight surgeon"}],
}
ENGAGEMENT_EXAMPLE = {
    "astronaut_id": 1, "as_of": "2026-11-14", "streak_weeks": 13, "tests_completed": 14,
    "next_test_due": "2026-11-15", "overdue": False,
    "badges": [{"code": code, "name": name, "earned": True} for code, name in services.BADGES],
    "mission_progress": {"day": 92, "planned": 900, "pct": 10.2},
}
FORBIDDEN = error_response("Crew can only see their own data.", "PERMISSION_DENIED",
                           "You don't have access to this astronaut's data.")
AS_OF = OpenApiParameter("as_of", str, description="YYYY-MM-DD. Default: today (finished missions: their last day).")


class TrendsView(APIView):
    @extend_schema(
        tags=["Reports"], summary="Trends (chart series by mission day)",
        description=(
            "The last `days` days (default 90) up to `as_of`: vision (one point per day with a test), cabin CO₂, "
            "daily logs and events, all keyed by `mission_day` so the charts line up. Events: `CO2_HIGH_START` "
            "(first day above the high mark after a normal day), `CO2_HIGH_END`, `ESCALATED` (RED result)."
        ),
        parameters=[OpenApiParameter("days", int, description=f"1–{config.TRENDS_MAX_DAYS}, default {config.TRENDS_DEFAULT_DAYS}."), AS_OF],
        responses={200: OpenApiTypes.OBJECT, 400: error_response("Bad parameter.", "VALIDATION_ERROR",
                   "Some fields are invalid.", {"days": ["Ensure this value is greater than or equal to 1."]}),
                   401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[OpenApiExample("Osei", value=TRENDS_EXAMPLE, response_only=True)],
    )
    def get(self, request, pk):
        astronaut = astronaut_for(request, pk)
        query = parse_query(TrendsQuerySerializer, request)
        return Response(services.trends(astronaut, query["days"], query.get("as_of") or today()))


class EngagementView(APIView):
    @extend_schema(
        tags=["Reports"], summary="Engagement (streak, badges, next test)",
        description="Rules in docs/04 §6. `streak_weeks` counts 7-day windows back from `as_of` with ≥1 scored test.",
        parameters=[AS_OF],
        responses={200: OpenApiTypes.OBJECT, 401: NOT_AUTHENTICATED, 403: FORBIDDEN},
        examples=[OpenApiExample("Osei", value=ENGAGEMENT_EXAMPLE, response_only=True)],
    )
    def get(self, request, pk):
        astronaut = astronaut_for(request, pk)
        as_of = parse_query(AsOfSerializer, request).get("as_of") or today()
        return Response(services.engagement(astronaut, as_of))
