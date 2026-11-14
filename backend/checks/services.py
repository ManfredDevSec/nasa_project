"""Saving a vision check and everything that follows from it (docs/02 §4, docs/06 T6).

The API (T7), the seed command (T8) and the admin all go through `submit_check`, so a
check is always saved together with its Baseline update or its Assessment, in one
transaction. Nothing is half-saved.
"""
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from crew.models import Baseline
from missions.models import CabinLog
from scoring import config
from scoring.engine import BaselineInput, CabinDay, CheckInput, Context, LifestyleDay, PreviousCheck, assess
from scoring.exceptions import NoBaselineError
from scoring.models import Assessment
from vitals.models import DailyLog

from .models import VisionCheck

BASELINE_FIELDS = ("near_vision_left", "near_vision_right", "contrast_left", "contrast_right")


def submit_check(validated_data):
    """Save one check. Returns (check, assessment | None, baseline | None).

    - Baseline check (is_baseline=True): save it and recompute the astronaut's Baseline.
      Returns (check, None, baseline).
    - Scored check: needs a Baseline (else NoBaselineError → 409 NO_BASELINE, nothing saved),
      then runs the engine and saves an Assessment. Returns (check, assessment, None).

    `validated_data` is a VisionCheckSerializer's validated_data (or the same keys:
    astronaut, near/contrast/amsler/symptom fields, optional taken_at, notes, ...).
    """
    return save_check(VisionCheck(**validated_data))


@transaction.atomic
def save_check(check):
    """Same as submit_check, for an already-built (unsaved) VisionCheck, e.g. from the admin."""
    check.full_clean(exclude=["mission_day"])  # same rules as the API, also for seed/admin callers

    if check.is_baseline:
        check.save()
        return check, None, recompute_baseline(check.astronaut)

    baseline = Baseline.objects.filter(astronaut=check.astronaut).first()
    if baseline is None:
        raise NoBaselineError()
    check.save()
    return check, score_check(check, baseline), None


def recompute_baseline(astronaut):
    """Baseline = average of ALL the astronaut's baseline checks, 2 decimals (docs/02 §3.4).
    No baseline checks left → the Baseline row is removed. Returns the Baseline or None."""
    rows = list(VisionCheck.objects.filter(astronaut=astronaut, is_baseline=True).values_list(*BASELINE_FIELDS))
    if not rows:
        Baseline.objects.filter(astronaut=astronaut).delete()
        return None
    averages = {
        name: (Decimal(sum(row[i] for row in rows)) / len(rows)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        for i, name in enumerate(BASELINE_FIELDS)
    }
    baseline, _ = Baseline.objects.update_or_create(
        astronaut=astronaut, defaults={**averages, "checks_used": len(rows)}
    )
    return baseline


def score_check(check, baseline):
    """Load the engine's context (docs/04 §2), run it, and save the Assessment."""
    check_date = timezone.localdate(check.taken_at)
    result = assess(_check_input(check, check_date), _context(check, check_date, baseline))
    return Assessment.objects.create(vision_check=check, **result.model_fields())


def _check_input(check, check_date):
    return CheckInput(
        taken_on=check_date,
        near_vision_left=check.near_vision_left, near_vision_right=check.near_vision_right,
        contrast_left=check.contrast_left, contrast_right=check.contrast_right,
        amsler_left=tuple(map(tuple, check.amsler_left)), amsler_right=tuple(map(tuple, check.amsler_right)),
        headache=check.headache, eye_pressure=check.eye_pressure, blur=check.blur,
    )


def _context(check, check_date, baseline):
    astronaut = check.astronaut
    mission = astronaut.mission

    # Earlier scored checks, by when they were TAKEN (not saved): the seed inserts history,
    # so id/created_at order can't be trusted. Ties on taken_at fall back to id.
    earlier = (
        VisionCheck.objects.filter(astronaut=astronaut, is_baseline=False)
        .filter(Q(taken_at__lt=check.taken_at) | Q(taken_at=check.taken_at, pk__lt=check.pk))
        .order_by("-taken_at", "-pk")[: config.TREND_CHECKS]
    )
    previous = tuple(
        PreviousCheck(
            near_vision_left=c.near_vision_left, near_vision_right=c.near_vision_right,
            amsler_left=tuple(map(tuple, c.amsler_left)), amsler_right=tuple(map(tuple, c.amsler_right)),
        )
        for c in reversed(earlier)  # oldest → newest
    )

    # Logs from the days before the check (the engine applies the exact windows).
    cabin_from = check_date - timedelta(days=config.CO2_LOOKBACK_DAYS)
    life_from = check_date - timedelta(days=config.LIFESTYLE_LOOKBACK_DAYS)
    cabin = tuple(
        CabinDay(date=log.date, co2_mmhg=log.co2_mmhg)
        for log in CabinLog.objects.filter(mission=mission, date__gte=cabin_from, date__lt=check_date)
    )
    daily = tuple(
        LifestyleDay(date=log.date, sodium_mg=log.sodium_mg, exercise_min=log.exercise_min)
        for log in DailyLog.objects.filter(astronaut=astronaut, date__gte=life_from, date__lt=check_date)
    )

    return Context(
        baseline=BaselineInput(*(getattr(baseline, name) for name in BASELINE_FIELDS)),
        previous_checks=previous,
        cabin_logs=cabin,
        daily_logs=daily,
        gravity_g=mission.gravity_g,
        test_interval_days=astronaut.test_interval_days,
    )
