from datetime import timedelta

from django.conf import settings
from django.db.models import Q

from checks.models import VisionCheck
from environment.models import EnvLog
from scoring.engine import evaluate
from scoring.models import Status


def score_check(check):
    t = settings.SIGHTLINE_THRESHOLDS

    try:
        baseline = check.astronaut.baseline
    except Exception:
        baseline = None

    previous = list(
        VisionCheck.objects.filter(astronaut=check.astronaut)
        .filter(Q(date__lt=check.date) | Q(date=check.date, id__lt=check.pk))
        .order_by("date", "id")
    )

    end_date = check.date - timedelta(days=1)
    start_date = check.date - timedelta(days=t["env_window_days"])
    env_logs = list(EnvLog.objects.filter(date__range=(start_date, end_date)))

    result = evaluate(check, baseline, previous, env_logs, t)

    status, _ = Status.objects.update_or_create(
        vision_check=check,
        defaults={
            "level": result.level,
            "reason": " · ".join(result.reasons),
            "actions": result.actions,
            "env_insight": result.env_insight,
        },
    )
    return status
