from rest_framework import serializers

from .models import Assessment


class AssessmentSerializer(serializers.ModelSerializer):
    """The `assessment` object in docs/03 V1/V2/V3."""

    class Meta:
        model = Assessment
        fields = [
            "id", "level", "worse_eye", "near_drift_left", "near_drift_right", "contrast_drift_left",
            "contrast_drift_right", "symptom_score", "new_amsler_left", "new_amsler_right", "reasons", "actions",
            "env_insights", "escalate_to_earth", "next_test_due",
        ]
        read_only_fields = fields
