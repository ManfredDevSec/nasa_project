from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from checks.models import VisionCheck
from crew.models import Astronaut
from environment.models import EnvLog
from scoring.services import score_check

from .selectors import (
    build_astronaut_summary,
    get_all_astronaut_summaries,
    get_astronaut_history,
)
from .serializers import (
    AstronautOutSerializer,
    CheckResultSerializer,
    EnvLogSerializer,
    ErrorSerializer,
    HistoryOutSerializer,
    MissionOutSerializer,
    VisionCheckCreateSerializer,
    WeeklyReportOutSerializer,
)


def _astronaut_or_404(pk):
    try:
        return Astronaut.objects.get(pk=pk)
    except Astronaut.DoesNotExist:
        return None


def _env_row(log, mission_start):
    return {
        "date": log.date,
        "mission_day": (log.date - mission_start).days + 1,
        "co2_mmhg": log.co2_mmhg,
        "sodium_mg": log.sodium_mg,
        "exercise_min": log.exercise_min,
    }


def _check_row(check):
    row = {
        "id": check.id,
        "date": check.date,
        "mission_day": check.mission_day,
        "near_vision": check.near_vision,
        "contrast": check.contrast,
        "amsler_left": check.amsler_left,
        "amsler_right": check.amsler_right,
        "headache": check.headache,
        "eye_pressure": check.eye_pressure,
        "blur": check.blur,
        "symptom_total": check.symptom_total,
        "status": None,
    }
    try:
        st = check.status
        row["status"] = {
            "level": st.level,
            "reason": st.reason,
            "actions": st.actions,
            "env_insight": st.env_insight,
        }
    except Exception:
        pass
    return row


class AstronautListView(APIView):
    serializer_class = AstronautOutSerializer

    @extend_schema(
        operation_id="astronauts_list",
        tags=["Astronauts"],
        summary="List all astronauts with current summary",
        responses={200: AstronautOutSerializer(many=True)},
    )
    def get(self, request):
        return Response(get_all_astronaut_summaries())


class AstronautDetailView(APIView):
    serializer_class = AstronautOutSerializer

    @extend_schema(
        operation_id="astronauts_detail",
        tags=["Astronauts"],
        summary="Retrieve a single astronaut summary",
        responses={200: AstronautOutSerializer, 404: ErrorSerializer},
    )
    def get(self, request, pk):
        astronaut = _astronaut_or_404(pk)
        if astronaut is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(build_astronaut_summary(astronaut))


class AstronautHistoryView(APIView):
    serializer_class = HistoryOutSerializer

    @extend_schema(
        operation_id="astronauts_history",
        tags=["Astronauts"],
        summary="Full check and env history for an astronaut",
        responses={200: HistoryOutSerializer, 404: ErrorSerializer},
    )
    def get(self, request, pk):
        astronaut = _astronaut_or_404(pk)
        if astronaut is None:
            return Response({"detail": "Not found."}, status=404)
        checks, env_logs = get_astronaut_history(astronaut)
        return Response({
            "astronaut": build_astronaut_summary(astronaut),
            "checks": [_check_row(c) for c in checks],
            "env": [_env_row(e, astronaut.mission_start) for e in env_logs],
        })


class CheckCreateView(APIView):
    serializer_class = VisionCheckCreateSerializer

    @extend_schema(
        operation_id="checks_create",
        tags=["Checks"],
        summary="Submit a new vision check",
        request=VisionCheckCreateSerializer,
        responses={201: CheckResultSerializer, 400: ErrorSerializer},
    )
    def post(self, request):
        ser = VisionCheckCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        d = ser.validated_data
        check = VisionCheck.objects.create(
            astronaut=d["astronaut"],
            date=d["date"],
            near_vision=d["near_vision"],
            contrast=d["contrast"],
            amsler_left=d["amsler_left"],
            amsler_right=d["amsler_right"],
            headache=d["headache"],
            eye_pressure=d["eye_pressure"],
            blur=d["blur"],
        )
        st = score_check(check)
        return Response(
            {
                "check_id": check.id,
                "date": check.date,
                "mission_day": check.mission_day,
                "level": st.level,
                "reason": st.reason,
                "actions": st.actions,
                "env_insight": st.env_insight,
            },
            status=201,
        )


class EnvListView(APIView):
    serializer_class = EnvLogSerializer

    @extend_schema(
        operation_id="env_list",
        tags=["Environment"],
        summary="List environment logs",
        parameters=[
            OpenApiParameter("from", OpenApiTypes.DATE, description="Start date YYYY-MM-DD"),
            OpenApiParameter("to", OpenApiTypes.DATE, description="End date YYYY-MM-DD"),
        ],
        responses={200: EnvLogSerializer(many=True)},
    )
    def get(self, request):
        qs = EnvLog.objects.all()
        from_date = request.query_params.get("from")
        to_date = request.query_params.get("to")
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)
        return Response(EnvLogSerializer(qs, many=True).data)

    @extend_schema(
        operation_id="env_create",
        tags=["Environment"],
        summary="Create an environment log",
        request=EnvLogSerializer,
        responses={201: EnvLogSerializer, 400: ErrorSerializer},
    )
    def post(self, request):
        ser = EnvLogSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        log = ser.save()
        return Response(EnvLogSerializer(log).data, status=201)


class MissionView(APIView):
    serializer_class = MissionOutSerializer

    @extend_schema(
        operation_id="mission_retrieve",
        tags=["Mission"],
        summary="Mission-wide summary and crew status counts",
        responses={200: MissionOutSerializer, 404: ErrorSerializer},
    )
    def get(self, request):
        today = timezone.localdate()
        earliest = Astronaut.objects.order_by("mission_start").first()
        if earliest is None:
            return Response({"detail": "No astronauts on record."}, status=404)

        mission_start = earliest.mission_start
        mission_day = (today - mission_start).days + 1

        today_env = EnvLog.objects.order_by("-date").first()
        t = settings.SIGHTLINE_THRESHOLDS
        co2_high = (
            today_env.co2_mmhg > t["co2_mmhg_high"] if today_env else False
        )

        counts = {"GREEN": 0, "AMBER": 0, "RED": 0}
        for astronaut in Astronaut.objects.prefetch_related("checks__status"):
            latest = astronaut.checks.order_by("date", "id").last()
            if latest:
                try:
                    counts[latest.status.level] += 1
                except Exception:
                    pass

        env_data = None
        if today_env:
            env_data = {
                "date": today_env.date,
                "co2_mmhg": today_env.co2_mmhg,
                "sodium_mg": today_env.sodium_mg,
                "exercise_min": today_env.exercise_min,
            }

        return Response({
            "mission_start": mission_start,
            "mission_day": mission_day,
            "today_env": env_data,
            "co2_high": co2_high,
            "thresholds": t,
            "crew_counts": counts,
        })


class WeeklyReportView(APIView):
    serializer_class = WeeklyReportOutSerializer

    @extend_schema(
        operation_id="report_weekly",
        tags=["Reports"],
        summary="Weekly crew vision report",
        parameters=[
            OpenApiParameter(
                "end",
                OpenApiTypes.DATE,
                description="End date YYYY-MM-DD (default today)",
            )
        ],
        responses={200: WeeklyReportOutSerializer, 400: ErrorSerializer},
    )
    def get(self, request):
        today = timezone.localdate()
        end_str = request.query_params.get("end")
        if end_str:
            from datetime import date as _date
            try:
                end = _date.fromisoformat(end_str)
            except ValueError:
                return Response({"detail": "Invalid end date."}, status=400)
        else:
            end = today

        start = end - timedelta(days=6)

        crew_data = []
        insights = []
        astronauts = Astronaut.objects.prefetch_related("checks__status", "baseline").order_by("id")

        for astronaut in astronauts:
            checks = list(
                astronaut.checks.select_related("status").order_by("date", "id")
            )
            latest_check = checks[-1] if checks else None

            try:
                bl = astronaut.baseline
                baseline = bl
            except Exception:
                baseline = None

            near_change_lines = None
            contrast_change = None
            latest_amsler = {"left": [], "right": []}
            if latest_check and baseline:
                near_change_lines = round(
                    (latest_check.near_vision - baseline.near_vision) / 0.1
                )
                contrast_change = round(latest_check.contrast - baseline.contrast, 2)
                latest_amsler = {
                    "left": latest_check.amsler_left,
                    "right": latest_check.amsler_right,
                }

            period_checks = [c for c in checks if start <= c.date <= end]
            checks_in_period = len(period_checks)

            history = []
            for c in checks:
                entry = {
                    "mission_day": c.mission_day,
                    "near_vision": c.near_vision,
                    "contrast": c.contrast,
                    "level": None,
                }
                try:
                    entry["level"] = c.status.level
                except Exception:
                    pass
                history.append(entry)

            latest_status_data = None
            if latest_check:
                try:
                    st = latest_check.status
                    latest_status_data = {
                        "check_id": latest_check.id,
                        "date": latest_check.date,
                        "mission_day": latest_check.mission_day,
                        "level": st.level,
                        "reason": st.reason,
                        "actions": st.actions,
                        "env_insight": st.env_insight,
                    }
                    if st.env_insight:
                        insights.append(f"{astronaut.name}: {st.env_insight}")
                except Exception:
                    pass

            crew_data.append({
                "id": astronaut.id,
                "name": astronaut.name,
                "role": astronaut.role,
                "latest_status": latest_status_data,
                "near_change_lines": near_change_lines,
                "contrast_change": contrast_change,
                "checks_in_period": checks_in_period,
                "latest_amsler": latest_amsler,
                "history": history,
            })

        env_logs = list(EnvLog.objects.filter(date__range=(start, end)))
        env_summary = {
            "avg_co2_mmhg": None,
            "max_co2_mmhg": None,
            "high_co2_days": None,
            "avg_sodium_mg": None,
            "avg_exercise_min": None,
        }
        if env_logs:
            t = settings.SIGHTLINE_THRESHOLDS
            n = len(env_logs)
            env_summary = {
                "avg_co2_mmhg": round(sum(e.co2_mmhg for e in env_logs) / n, 2),
                "max_co2_mmhg": round(max(e.co2_mmhg for e in env_logs), 2),
                "high_co2_days": sum(
                    1 for e in env_logs if e.co2_mmhg > t["co2_mmhg_high"]
                ),
                "avg_sodium_mg": round(sum(e.sodium_mg for e in env_logs) / n, 1),
                "avg_exercise_min": round(sum(e.exercise_min for e in env_logs) / n, 1),
            }

        earliest = Astronaut.objects.order_by("mission_start").first()
        mission_day = (end - earliest.mission_start).days + 1 if earliest else None

        return Response({
            "generated_at": timezone.now(),
            "mission_day": mission_day,
            "period": {"start": start, "end": end},
            "crew": crew_data,
            "environment": env_summary,
            "insights": insights,
        })
