"""Who can see/change what (docs/03_API_SPECIFICATION.md §1, "Roles & permissions").

| Role            | View                         | Edit (checks, daily logs)   |
|-----------------|------------------------------|-----------------------------|
| CREW            | own astronaut only           | own astronaut only          |
| MEDICAL_OFFICER | whole crew (same mission)    | whole crew (same mission)   |
| FLIGHT_SURGEON  | everyone                     | nothing (read-only)         |
| ADMIN/superuser | everyone                     | everyone                    |

Use in views (T7+):
    permission_classes = [IsAuthenticated, AstronautAccess]   # object-level, per astronaut
    permission_classes = [role_required(Role.MEDICAL_OFFICER)] # e.g. cabin-log writes (ADMIN always passes)
    queryset = visible_astronauts(request.user)                # list filtering
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from crew.models import Astronaut

from .models import User

Role = User.Role


def _astronaut(astronaut_or_id):
    if isinstance(astronaut_or_id, Astronaut):
        return astronaut_or_id
    return Astronaut.objects.filter(pk=astronaut_or_id).first()


def _same_crew(user, astronaut):
    return user.astronaut is not None and user.astronaut.mission_id == astronaut.mission_id


def can_view_astronaut(user, astronaut_or_id):
    if not (user and user.is_authenticated):
        return False
    if user.is_admin_role or user.role == Role.FLIGHT_SURGEON:
        return True
    astronaut = _astronaut(astronaut_or_id)
    if astronaut is None:
        return False
    if user.role == Role.MEDICAL_OFFICER:
        return _same_crew(user, astronaut)
    if user.role == Role.CREW:
        return user.astronaut_id == astronaut.pk
    return False


def can_edit_astronaut(user, astronaut_or_id):
    if not (user and user.is_authenticated):
        return False
    if user.is_admin_role:
        return True
    if user.role == Role.FLIGHT_SURGEON:
        return False
    return can_view_astronaut(user, astronaut_or_id)  # CREW: own; MO: same crew


def visible_astronauts(user):
    """Astronauts whose details this user may see."""
    qs = Astronaut.objects.all()
    if not (user and user.is_authenticated):
        return qs.none()
    if user.is_admin_role or user.role == Role.FLIGHT_SURGEON:
        return qs
    if user.role == Role.MEDICAL_OFFICER and user.astronaut_id:
        return qs.filter(mission_id=user.astronaut.mission_id)
    if user.role == Role.CREW and user.astronaut_id:
        return qs.filter(pk=user.astronaut_id)
    return qs.none()


class AstronautAccess(BasePermission):
    """Object permission. `obj` is an Astronaut or anything with an `.astronaut`
    (VisionCheck, DailyLog, ...). Reads need view rights, writes need edit rights."""

    message = "You don't have access to this astronaut's data."

    def has_object_permission(self, request, view, obj):
        astronaut = obj if isinstance(obj, Astronaut) else getattr(obj, "astronaut", None)
        if astronaut is None:
            return False
        if request.method in SAFE_METHODS:
            return can_view_astronaut(request.user, astronaut)
        return can_edit_astronaut(request.user, astronaut)


class HasRole(BasePermission):
    """Allow only the listed roles. ADMIN (and superusers) always pass."""

    roles = ()
    message = "Your role can't do this."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_admin_role or user.role in self.roles))


def role_required(*roles):
    """role_required(Role.MEDICAL_OFFICER, Role.FLIGHT_SURGEON) -> permission class."""
    name = "Role_" + "_".join(roles)
    return type(name, (HasRole,), {"roles": tuple(roles)})


# Ready-made ones from the endpoint table (docs/03 §2).
IsAdmin = role_required()  # no extra roles: only ADMIN / superusers (user management)
IsMedicalOfficer = role_required(Role.MEDICAL_OFFICER)  # E1 cabin-log writes
CanSeeCrewOverview = role_required(Role.MEDICAL_OFFICER, Role.FLIGHT_SURGEON)  # R4, R5
