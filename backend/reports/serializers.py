from datetime import date

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from checks.models import VisionCheck
from environment.models import EnvLog


@extend_schema_field(
    {
        "type": "array",
        "items": {
            "type": "array",
            "items": {"type": "integer", "minimum": 0, "maximum": 19},
            "minItems": 2,
            "maxItems": 2,
        },
    }
)
class AmslerCellsField(serializers.Field):
    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Must be a list.")
        for item in data:
            if (
                not isinstance(item, list)
                or len(item) != 2
                or not all(isinstance(v, int) and 0 <= v <= 19 for v in item)
            ):
                raise serializers.ValidationError(
                    "Each cell must be [row, col] with ints 0–19."
                )
        return data

    def to_representation(self, value):
        return value


class VisionCheckCreateSerializer(serializers.Serializer):
    astronaut = serializers.PrimaryKeyRelatedField(
        queryset=__import__("crew.models", fromlist=["Astronaut"]).Astronaut.objects.all()
    )
    near_vision = serializers.FloatField()
    contrast = serializers.FloatField()
    amsler_left = AmslerCellsField(default=list)
    amsler_right = AmslerCellsField(default=list)
    headache = serializers.IntegerField(min_value=0, max_value=3, default=0)
    eye_pressure = serializers.IntegerField(min_value=0, max_value=3, default=0)
    blur = serializers.IntegerField(min_value=0, max_value=3, default=0)
    date = serializers.DateField(default=timezone.localdate)


class EnvLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnvLog
        fields = ["id", "date", "co2_mmhg", "sodium_mg", "exercise_min"]


# ---------------------------------------------------------------------------
# Output-only serializers (schema documentation — views return raw dicts)
# ---------------------------------------------------------------------------

class ErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()


class StatusOutSerializer(serializers.Serializer):
    """Inline check status embedded within a HistoryCheckSerializer."""
    level = serializers.CharField()
    reason = serializers.CharField()
    actions = serializers.ListField(child=serializers.CharField())
    env_insight = serializers.CharField(allow_null=True)


class BaselineOutSerializer(serializers.Serializer):
    near_vision = serializers.FloatField()
    contrast = serializers.FloatField()


class CheckResultSerializer(serializers.Serializer):
    """Shape returned by POST /checks/ (201) and used as latest_status."""
    check_id = serializers.IntegerField()
    date = serializers.DateField()
    mission_day = serializers.IntegerField()
    level = serializers.CharField()
    reason = serializers.CharField()
    actions = serializers.ListField(child=serializers.CharField())
    env_insight = serializers.CharField(allow_null=True)


class AstronautOutSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    role = serializers.CharField()
    mission_start = serializers.DateField()
    mission_day = serializers.IntegerField()
    baseline = BaselineOutSerializer(allow_null=True)
    latest_status = CheckResultSerializer(allow_null=True)
    next_test_due = serializers.DateField()
    streak = serializers.IntegerField()


class HistoryCheckSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    date = serializers.DateField()
    mission_day = serializers.IntegerField()
    near_vision = serializers.FloatField()
    contrast = serializers.FloatField()
    amsler_left = AmslerCellsField()
    amsler_right = AmslerCellsField()
    headache = serializers.IntegerField()
    eye_pressure = serializers.IntegerField()
    blur = serializers.IntegerField()
    symptom_total = serializers.IntegerField()
    status = StatusOutSerializer(allow_null=True)


class HistoryEnvSerializer(serializers.Serializer):
    date = serializers.DateField()
    mission_day = serializers.IntegerField()
    co2_mmhg = serializers.FloatField()
    sodium_mg = serializers.FloatField()
    exercise_min = serializers.IntegerField()


class HistoryOutSerializer(serializers.Serializer):
    astronaut = AstronautOutSerializer()
    checks = HistoryCheckSerializer(many=True)
    env = HistoryEnvSerializer(many=True)


class _EnvSnapshotSerializer(serializers.Serializer):
    date = serializers.DateField()
    co2_mmhg = serializers.FloatField()
    sodium_mg = serializers.FloatField()
    exercise_min = serializers.IntegerField()


class MissionOutSerializer(serializers.Serializer):
    mission_start = serializers.DateField()
    mission_day = serializers.IntegerField()
    today_env = _EnvSnapshotSerializer(allow_null=True)
    co2_high = serializers.BooleanField()
    thresholds = serializers.DictField()
    crew_counts = serializers.DictField(child=serializers.IntegerField())


class _WeeklyHistoryEntrySerializer(serializers.Serializer):
    mission_day = serializers.IntegerField()
    near_vision = serializers.FloatField()
    contrast = serializers.FloatField()
    level = serializers.CharField(allow_null=True)


class _AmslerPairSerializer(serializers.Serializer):
    left = AmslerCellsField()
    right = AmslerCellsField()


class WeeklyCrewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    role = serializers.CharField()
    latest_status = CheckResultSerializer(allow_null=True)
    near_change_lines = serializers.IntegerField(allow_null=True)
    contrast_change = serializers.FloatField(allow_null=True)
    checks_in_period = serializers.IntegerField()
    latest_amsler = _AmslerPairSerializer()
    history = _WeeklyHistoryEntrySerializer(many=True)


class WeeklyEnvSerializer(serializers.Serializer):
    avg_co2_mmhg = serializers.FloatField(allow_null=True)
    max_co2_mmhg = serializers.FloatField(allow_null=True)
    high_co2_days = serializers.IntegerField(allow_null=True)
    avg_sodium_mg = serializers.FloatField(allow_null=True)
    avg_exercise_min = serializers.FloatField(allow_null=True)


class _PeriodSerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()


class WeeklyReportOutSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    mission_day = serializers.IntegerField(allow_null=True)
    period = _PeriodSerializer()
    crew = WeeklyCrewSerializer(many=True)
    environment = WeeklyEnvSerializer()
    insights = serializers.ListField(child=serializers.CharField())
