from rest_framework import serializers

from core.validators import between_messages

from .models import DailyLog

RANGES = {
    "resting_hr_bpm": (30, 200), "systolic_mmhg": (70, 220), "diastolic_mmhg": (40, 140),
    "sleep_hours": (0, 24), "mood": (1, 5), "sodium_mg": (0, 10000), "exercise_min": (0, 600),
}


class DailyLogSerializer(serializers.ModelSerializer):
    """docs/03 D1/D2. Every value is optional."""

    class Meta:
        model = DailyLog
        fields = [
            "id", "astronaut", "date", "mission_day", "resting_hr_bpm", "systolic_mmhg", "diastolic_mmhg",
            "sleep_hours", "mood", "sodium_mg", "exercise_min", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "mission_day", "created_at", "updated_at"]
        extra_kwargs = {field: {"error_messages": between_messages(*limits)} for field, limits in RANGES.items()}
