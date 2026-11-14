from rest_framework import serializers

from accounts.permissions import can_view_astronaut
from scoring.models import Assessment

from .models import Astronaut, Baseline


def latest_assessment(astronaut):
    """The astronaut's most recent assessment by test time (None before the first scored check)."""
    return (
        Assessment.objects.filter(astronaut=astronaut)
        .select_related("vision_check")
        .order_by("-vision_check__taken_at", "-pk")
        .first()
    )


class LatestStatusSerializer(serializers.Serializer):
    level = serializers.CharField()
    mission_day = serializers.IntegerField()
    headline = serializers.CharField(allow_null=True)
    next_test_due = serializers.DateField(allow_null=True)


def latest_status(astronaut, user):
    """docs/03 C1 `latest_status`. Headline = first reason. Crew looking at a crewmate only
    get the colour (docs/03 §2: "names + status colour, only their own details")."""
    a = latest_assessment(astronaut)
    if a is None:
        return None
    full = can_view_astronaut(user, astronaut)
    return {
        "level": a.level,
        "mission_day": a.vision_check.mission_day,
        "headline": a.reasons[0] if full and a.reasons else None,
        "next_test_due": a.next_test_due.isoformat() if full else None,
    }


class AstronautSerializer(serializers.ModelSerializer):
    """docs/03 C1 list item."""

    latest_status = serializers.SerializerMethodField()

    class Meta:
        model = Astronaut
        fields = ["id", "full_name", "call_sign", "crew_role", "is_medical_officer", "latest_status"]

    def get_latest_status(self, astronaut) -> LatestStatusSerializer(allow_null=True):
        return latest_status(astronaut, self.context["request"].user)


class AstronautDetailSerializer(AstronautSerializer):
    """docs/03 C2: the list item plus profile fields."""

    class Meta(AstronautSerializer.Meta):
        fields = AstronautSerializer.Meta.fields + ["display_name", "mission", "avatar_url", "test_interval_days"]


class BaselineSerializer(serializers.ModelSerializer):
    """docs/03 C3."""

    class Meta:
        model = Baseline
        fields = ["near_vision_left", "near_vision_right", "contrast_left", "contrast_right", "checks_used", "updated_at"]
