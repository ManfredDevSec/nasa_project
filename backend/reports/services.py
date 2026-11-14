"""Computed reports (docs/01 §5: business logic lives here, not in views). No tables of their own.

T9: body map. T10/T11 add trends, engagement, crew overview and the weekly report here.
"""
from datetime import datetime, time, timedelta, timezone as dt_timezone

from django.db.models import Q

from core.enums import UNKNOWN
from scoring.models import Assessment
from scoring.vitals_rules import heart_part_status, mood_status, sleep_status
from vitals.models import DailyLog

from .content import BODY_PARTS, PART_CONTENT


def latest_assessment_on(astronaut, as_of):
    """The astronaut's latest assessment for a test taken on or before `as_of`."""
    return (
        Assessment.objects.filter(astronaut=astronaut, vision_check__taken_at__date__lte=as_of)
        .select_related("vision_check")
        .order_by("-vision_check__taken_at", "-pk")
        .first()
    )


def _latest_log_with(astronaut, as_of, *fields):
    """Most recent daily log on/before `as_of` that has at least one of `fields` filled in."""
    any_filled = Q()
    for field in fields:
        any_filled |= Q(**{f"{field}__isnull": False})
    return (
        DailyLog.objects.filter(astronaut=astronaut, date__lte=as_of)
        .filter(any_filled)
        .order_by("-date")
        .first()
    )


def _day_start(day):
    """Daily logs are per day: report them as the start of that day (UTC)."""
    return datetime.combine(day, time.min, tzinfo=dt_timezone.utc)


def _short_date(day):
    return f"{day.day} {day:%b}"


def _part(part, level, summary, last_updated, guidance):
    content = PART_CONTENT[part]
    return {
        "part": part,
        "level": str(level),
        "summary": summary,
        "guidance": guidance,
        "last_updated": last_updated,
        "info": dict(content["info"]),
        "action": dict(content["action"]),
        "read_more_url": content["read_more_url"],
    }


def _no_data(part):
    return _part(part, UNKNOWN, PART_CONTENT[part]["no_data_summary"], None, None)


def _eyes(astronaut, as_of):
    a = latest_assessment_on(astronaut, as_of)
    if a is None:
        return _no_data("EYES")
    headline = a.reasons[0] if a.reasons else ""
    if a.level == "GREEN":
        summary = f"Vision matches your normal. Next test by {_short_date(a.next_test_due)}."
    else:
        summary = f"{headline} Test again by {_short_date(a.next_test_due)}."
    guidance = a.actions[0]["text"] if a.actions else None  # most urgent action
    return _part("EYES", a.level, summary, a.vision_check.taken_at, guidance)


def _heart(astronaut, as_of):
    log = _latest_log_with(astronaut, as_of, "resting_hr_bpm", "systolic_mmhg", "diastolic_mmhg")
    if log is None:
        return _no_data("HEART")
    status = heart_part_status(log.resting_hr_bpm, log.systolic_mmhg, log.diastolic_mmhg)
    bits = []
    if log.resting_hr_bpm is not None:
        bits.append(f"HR {log.resting_hr_bpm}")
    if log.systolic_mmhg is not None and log.diastolic_mmhg is not None:
        bits.append(f"BP {log.systolic_mmhg}/{log.diastolic_mmhg}")
    return _part("HEART", status["level"], ", ".join(bits), _day_start(log.date), status["text"])


def _sleep(astronaut, as_of):
    log = _latest_log_with(astronaut, as_of, "sleep_hours")
    if log is None:
        return _no_data("SLEEP")
    status = sleep_status(log.sleep_hours)
    when = "last night" if log.date >= as_of - timedelta(days=1) else f"on {_short_date(log.date)}"
    return _part("SLEEP", status["level"], f"{log.sleep_hours:.1f} h {when}", _day_start(log.date), status["text"])


def _mind(astronaut, as_of):
    log = _latest_log_with(astronaut, as_of, "mood")
    if log is None:
        return _no_data("MIND")
    status = mood_status(log.mood)
    return _part("MIND", status["level"], f"Mood {log.mood}/5", _day_start(log.date), status["text"])


def body_map(astronaut, as_of):
    """docs/03 R1. Each part's status as of `as_of` (a date; usually today)."""
    builders = {"EYES": _eyes, "HEART": _heart, "SLEEP": _sleep, "MIND": _mind}
    return {
        "astronaut_id": astronaut.pk,
        "mission_day": astronaut.mission.mission_day(as_of),
        "as_of": as_of,
        "parts": [builders[part](astronaut, as_of) for part in BODY_PARTS],
    }
