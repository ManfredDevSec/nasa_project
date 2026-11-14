from datetime import date

from django.utils import timezone
from rest_framework import serializers

from checks.models import VisionCheck
from environment.models import EnvLog


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
