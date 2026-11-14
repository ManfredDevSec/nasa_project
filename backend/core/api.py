"""Small helpers shared by the T7+ API views."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import can_edit_astronaut, can_view_astronaut
from crew.models import Astronaut
from missions.models import Mission
from sightline.exceptions import ConflictError

FROM_PARAM = OpenApiParameter("from", OpenApiTypes.DATE, description="Earliest date, inclusive (YYYY-MM-DD).")
TO_PARAM = OpenApiParameter("to", OpenApiTypes.DATE, description="Latest date, inclusive (YYYY-MM-DD).")
ASTRONAUT_PARAM = OpenApiParameter(
    "astronaut", int, description="Only this astronaut. Left out: everyone you may see (crew: only yourself)."
)


class DateRangeSerializer(serializers.Serializer):
    """Validates ?from=&to= (both optional, inclusive). `from` is a Python keyword, hence the dict."""

    def get_fields(self):
        return {
            "from": serializers.DateField(required=False),
            "to": serializers.DateField(required=False),
            "astronaut": serializers.IntegerField(required=False, min_value=1),
        }

    def validate(self, attrs):
        if attrs.get("from") and attrs.get("to") and attrs["from"] > attrs["to"]:
            raise serializers.ValidationError({"from": ["Must be on or before 'to'."]})
        return attrs


def parse_query(serializer_class, request):
    s = serializer_class(data=request.query_params)
    s.is_valid(raise_exception=True)
    return s.validated_data


def astronaut_for(request, astronaut_id, edit=False):
    """The astronaut, or 404 if it doesn't exist, or 403 if this user may not see/change it."""
    astronaut = get_object_or_404(Astronaut.objects.select_related("mission"), pk=astronaut_id)
    allowed = can_edit_astronaut if edit else can_view_astronaut
    if not allowed(request.user, astronaut):
        raise PermissionDenied("You don't have access to this astronaut's data.")
    return astronaut


def check_edit_permission(request, astronaut):
    if not can_edit_astronaut(request.user, astronaut):
        raise PermissionDenied("You can't add data for this astronaut.")


def active_mission():
    mission = Mission.objects.filter(is_active=True).first()
    if mission is None:
        raise ConflictError("There is no active mission yet.", code="NO_ACTIVE_MISSION")
    return mission


def users_mission(user):
    """Astronauts see their own mission; everyone else the active one."""
    return user.astronaut.mission if user.astronaut_id else active_mission()


def apply_date_range(queryset, filters, field):
    if filters.get("from"):
        queryset = queryset.filter(**{f"{field}__gte": filters["from"]})
    if filters.get("to"):
        queryset = queryset.filter(**{f"{field}__lte": filters["to"]})
    return queryset


def today():
    """Today in the server time zone (UTC, docs/01 §4)."""
    return timezone.localdate()


def required_value(data, name, field):
    """Validate one input value up front (e.g. the date an upsert looks up), errors under its name."""
    try:
        return field.run_validation(data.get(name, serializers.empty))
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({name: exc.detail})
