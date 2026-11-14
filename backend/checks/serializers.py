from rest_framework import serializers

from core.validators import between_messages

from .models import VisionCheck

RANGES = {
    "near_vision_left": (1, 10), "near_vision_right": (1, 10),
    "contrast_left": (1, 8), "contrast_right": (1, 8),
    "headache": (0, 3), "eye_pressure": (0, 3), "blur": (0, 3),
}


class VisionCheckSerializer(serializers.ModelSerializer):
    """Input/output for one check (docs/03 V1 request, and the `check` object in responses).

    Validation matches the model exactly: ranges from docs/02 §3.5 with the spec's
    "Must be between 1 and 10." wording, and the shared Amsler rule (validate_amsler_cells,
    picked up from the model field). Permission checks (who may submit for which
    astronaut) live in the view (T7).
    """

    class Meta:
        model = VisionCheck
        fields = [
            "id", "astronaut", "taken_at", "mission_day", "is_baseline",
            "near_vision_left", "near_vision_right", "contrast_left", "contrast_right",
            "amsler_left", "amsler_right", "headache", "eye_pressure", "blur",
            "distance_ok", "notes", "created_at",
        ]
        read_only_fields = ["id", "mission_day", "created_at"]
        extra_kwargs = {
            **{field: {"error_messages": between_messages(*limits)} for field, limits in RANGES.items()},
            "taken_at": {"required": False},  # default: now
            "amsler_left": {"required": False},  # default: []
            "amsler_right": {"required": False},
        }
