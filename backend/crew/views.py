"""Crew endpoints (docs/03 C1–C3)."""
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from core.api import astronaut_for
from core.schema import NOT_AUTHENTICATED, error_response
from missions.models import Mission
from sightline.exceptions import NotFoundError

from .models import Astronaut, Baseline
from .serializers import AstronautDetailSerializer, AstronautSerializer, BaselineSerializer

FORBIDDEN = error_response("Crew can only open their own details.", "PERMISSION_DENIED",
                           "You don't have access to this astronaut's data.")
NOT_FOUND = error_response("No astronaut with this id.", "NOT_FOUND", "Not found.")
STATUS = {"level": "RED", "mission_day": 91, "headline": "Left eye near vision is 2 lines below your normal.",
          "next_test_due": "2026-11-16"}
ASTRONAUT = {"id": 1, "full_name": "Ama Osei", "call_sign": "Osei", "crew_role": "COMMANDER",
             "is_medical_officer": False, "latest_status": STATUS}


class AstronautListView(APIView):
    @extend_schema(
        tags=["Crew"], summary="Crew list with latest status",
        description=(
            "Everyone on your mission (the active mission for flight surgeons/admins). `latest_status` is null "
            "before the first scored check. Crew members see a crewmate's colour (`level`) but not their "
            "`headline` / `next_test_due` (null)."
        ),
        responses={200: AstronautSerializer(many=True), 401: NOT_AUTHENTICATED},
        examples=[OpenApiExample("Crew", value=[ASTRONAUT], response_only=True)],
    )
    def get(self, request):
        user = request.user
        mission = user.astronaut.mission if user.astronaut_id else Mission.objects.filter(is_active=True).first()
        crew = Astronaut.objects.filter(mission=mission).order_by("id") if mission else Astronaut.objects.none()
        return Response(AstronautSerializer(crew, many=True, context={"request": request}).data)


class AstronautDetailView(APIView):
    @extend_schema(
        tags=["Crew"], summary="One astronaut",
        responses={200: AstronautDetailSerializer, 401: NOT_AUTHENTICATED, 403: FORBIDDEN, 404: NOT_FOUND},
        examples=[OpenApiExample("Osei", response_only=True, value={
            **ASTRONAUT, "display_name": "Cmdr. Ama Osei", "mission": 1, "avatar_url": "", "test_interval_days": 7})],
    )
    def get(self, request, pk):
        astronaut = astronaut_for(request, pk)
        return Response(AstronautDetailSerializer(astronaut, context={"request": request}).data)


class BaselineView(APIView):
    @extend_schema(
        tags=["Crew"], summary="Baseline (pre-flight normal)",
        description="Average of the astronaut's pre-flight baseline checks.",
        responses={200: BaselineSerializer, 401: NOT_AUTHENTICATED, 403: FORBIDDEN,
                   404: error_response("No baseline checks yet.", "NO_BASELINE", "This astronaut has no baseline yet.")},
        examples=[OpenApiExample("Baseline", response_only=True, value={
            "near_vision_left": 8.0, "near_vision_right": 8.33, "contrast_left": 6.0, "contrast_right": 6.0,
            "checks_used": 3, "updated_at": "2026-08-05T10:00:00Z"})],
    )
    def get(self, request, pk):
        astronaut = astronaut_for(request, pk)
        baseline = Baseline.objects.filter(astronaut=astronaut).first()
        if baseline is None:
            raise NotFoundError("This astronaut has no baseline yet.", code="NO_BASELINE")
        return Response(BaselineSerializer(baseline).data)
