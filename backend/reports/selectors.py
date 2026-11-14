from datetime import timedelta

from django.utils import timezone

from checks.models import VisionCheck
from crew.models import Astronaut
from environment.models import EnvLog


def _next_test_due(latest_check, latest_status):
    today = timezone.localdate()
    if latest_check is None:
        return today
    intervals = {"GREEN": 7, "AMBER": 2, "RED": 1}
    delta = intervals.get(latest_status.level, 7)
    return latest_check.date + timedelta(days=delta)


def _streak(checks):
    if not checks:
        return 0
    ordered = sorted(checks, key=lambda c: (c.date, c.id))
    count = 1
    for i in range(len(ordered) - 1, 0, -1):
        gap = (ordered[i].date - ordered[i - 1].date).days
        if gap <= 8:
            count += 1
        else:
            break
    return count


def build_astronaut_summary(astronaut, today=None):
    if today is None:
        today = timezone.localdate()

    checks = list(astronaut.checks.select_related("status").order_by("date", "id"))
    latest_check = checks[-1] if checks else None

    try:
        bl = astronaut.baseline
        baseline = {"near_vision": bl.near_vision, "contrast": bl.contrast}
    except Exception:
        baseline = None

    latest_status = None
    if latest_check is not None:
        try:
            st = latest_check.status
            latest_status = {
                "check_id": latest_check.id,
                "date": latest_check.date,
                "mission_day": latest_check.mission_day,
                "level": st.level,
                "reason": st.reason,
                "actions": st.actions,
                "env_insight": st.env_insight,
            }
        except Exception:
            pass

    next_due = _next_test_due(latest_check, latest_check.status if latest_check else None)

    return {
        "id": astronaut.id,
        "name": astronaut.name,
        "role": astronaut.role,
        "mission_start": astronaut.mission_start,
        "mission_day": astronaut.mission_day_for(today),
        "baseline": baseline,
        "latest_status": latest_status,
        "next_test_due": next_due,
        "streak": _streak(checks),
    }


def get_all_astronaut_summaries():
    astronauts = Astronaut.objects.prefetch_related(
        "checks__status", "baseline"
    ).order_by("id")
    today = timezone.localdate()
    return [build_astronaut_summary(a, today) for a in astronauts]


def get_astronaut_history(astronaut):
    today = timezone.localdate()
    checks = list(
        VisionCheck.objects.filter(astronaut=astronaut)
        .select_related("status")
        .order_by("date", "id")
    )
    env = list(
        EnvLog.objects.filter(date__range=(astronaut.mission_start, today))
    )
    return checks, env
