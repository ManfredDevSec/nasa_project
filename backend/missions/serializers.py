from rest_framework import serializers

from core.api import today
from core.validators import between_messages

from .models import CabinLog, Mission


class MissionSerializer(serializers.ModelSerializer):
    """docs/03 M1."""

    mission_day_today = serializers.SerializerMethodField()

    class Meta:
        model = Mission
        fields = ["id", "name", "environment", "gravity_g", "start_date", "mission_day_today", "planned_duration_days"]

    def get_mission_day_today(self, mission) -> int:
        return mission.mission_day(today())


class CabinLogSerializer(serializers.ModelSerializer):
    """docs/03 E1/E2. The mission is always the active one, so it isn't sent."""

    class Meta:
        model = CabinLog
        fields = ["id", "mission", "date", "mission_day", "co2_mmhg", "temperature_c", "humidity_pct"]
        read_only_fields = ["id", "mission", "mission_day"]
        extra_kwargs = {
            "co2_mmhg": {"error_messages": between_messages(0, 15)},
            "humidity_pct": {"error_messages": between_messages(0, 100)},
        }
