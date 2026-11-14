"""Computed reports (docs/01 §5: business logic lives here, not in views). No tables of their own.

T9: body map. T10/T11 add trends, engagement, crew overview and the weekly report here.
"""
from datetime import datetime, time, timedelta, timezone as dt_timezone
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Q
from django.utils import timezone

from checks.models import VisionCheck
from core.enums import UNKNOWN
from crew.models import Baseline
from missions.models import CabinLog
from scoring import config
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


# --- shared: the date a report looks from -----------------------------------------

def mission_end(mission):
    """Last planned day of the mission."""
    return mission.start_date + timedelta(days=mission.planned_duration_days - 1)


def reference_date(astronaut, as_of):
    """'Today' for reports: as_of (default today), but never after the mission ended,
    so finished missions show their final state instead of empty charts."""
    return min(as_of, mission_end(astronaut.mission))


# --- T10: trends (docs/03 R2) ---------------------------------------------------------

DAILY_TREND_FIELDS = (
    "sodium_mg", "exercise_min", "sleep_hours", "mood", "resting_hr_bpm", "systolic_mmhg", "diastolic_mmhg",
)


def _co2_events(logs_by_day):
    """CO2_HIGH_START = first day above CO2_HIGH_MMHG after a normal day (agreed rule);
    CO2_HIGH_END = first day back at or below it. Computed over the whole mission."""
    high = Decimal(str(config.CO2_HIGH_MMHG))
    events, was_high = [], False
    for day in sorted(logs_by_day):
        is_high = logs_by_day[day].co2_mmhg > high
        if is_high and not was_high:
            events.append({"mission_day": day, "type": "CO2_HIGH_START", "text": "Cabin CO₂ above normal"})
        elif was_high and not is_high:
            events.append({"mission_day": day, "type": "CO2_HIGH_END", "text": "Cabin CO₂ back to normal"})
        was_high = is_high
    return events


def trends(astronaut, days, as_of):
    """Chart series for the `days` days up to the reference date, all keyed by mission_day."""
    mission = astronaut.mission
    end = reference_date(astronaut, as_of)
    start = end - timedelta(days=days - 1)

    baseline = Baseline.objects.filter(astronaut=astronaut).first()

    checks = (
        VisionCheck.objects.filter(astronaut=astronaut, is_baseline=False,
                                   taken_at__date__gte=start, taken_at__date__lte=end)
        .select_related("assessment").order_by("taken_at", "pk")
    )
    by_day = {}
    for c in checks:  # one point per day: the day's last test wins
        by_day[c.mission_day] = c
    vision = [
        {
            "date": timezone.localdate(c.taken_at), "mission_day": c.mission_day,
            "near_vision_left": c.near_vision_left, "near_vision_right": c.near_vision_right,
            "contrast_left": c.contrast_left, "contrast_right": c.contrast_right,
            "level": c.assessment.level if hasattr(c, "assessment") else None,
        }
        for _, c in sorted(by_day.items())
    ]

    all_cabin = {log.mission_day: log for log in CabinLog.objects.filter(mission=mission, date__lte=end)}
    cabin = [
        {"date": log.date, "mission_day": day, "co2_mmhg": log.co2_mmhg}
        for day, log in sorted(all_cabin.items()) if log.date >= start
    ]

    daily = [
        {"date": log.date, "mission_day": log.mission_day, **{f: getattr(log, f) for f in DAILY_TREND_FIELDS}}
        for log in DailyLog.objects.filter(astronaut=astronaut, date__gte=start, date__lte=end).order_by("date")
    ]

    first_day, last_day = mission.mission_day(start), mission.mission_day(end)
    events = [e for e in _co2_events(all_cabin) if first_day <= e["mission_day"] <= last_day]
    events += [
        {"mission_day": p["mission_day"], "type": "ESCALATED", "text": "Red result: sent to the flight surgeon"}
        for p in vision if p["level"] == "RED"
    ]
    events.sort(key=lambda e: e["mission_day"])

    return {
        "astronaut_id": astronaut.pk,
        "period": {"from": start, "to": end, "days": days},
        "baseline": (
            {f: getattr(baseline, f) for f in ("near_vision_left", "near_vision_right", "contrast_left", "contrast_right")}
            if baseline else None
        ),
        "vision": vision,
        "cabin_co2": cabin,
        "daily": daily,
        "events": events,
    }



# --- T10: engagement (docs/03 R3, docs/04 §6) -----------------------------------------

BADGES = [
    ("FIRST_TEST", "First Look"),
    ("STREAK_4", "Steady Eyes (4 weeks)"),
    ("STREAK_12", "Clear Orbit (12 weeks)"),
    ("DAILY_LOG_30", "30 Daily Logs"),
    ("EARLY_REPORTER", "Reported symptoms early"),
]


def streak_weeks(check_dates, today):
    """Consecutive 7-day windows counting back from `today` (window 1 = today and the 6 days
    before) that each contain at least one scored check."""
    dates = set(check_dates)
    weeks = 0
    while True:
        window_end = today - timedelta(days=weeks * config.STREAK_WINDOW_DAYS)
        window = {window_end - timedelta(days=i) for i in range(config.STREAK_WINDOW_DAYS)}
        if not dates & window:
            return weeks
        weeks += 1


def engagement(astronaut, as_of):
    mission = astronaut.mission
    today_ = reference_date(astronaut, as_of)
    scored = VisionCheck.objects.filter(astronaut=astronaut, is_baseline=False, taken_at__date__lte=today_)
    check_dates = [timezone.localdate(t) for t in scored.values_list("taken_at", flat=True)]

    latest = latest_assessment_on(astronaut, today_)
    next_due = latest.next_test_due if latest else mission.start_date + timedelta(days=astronaut.test_interval_days)
    streak = streak_weeks(check_dates, today_)
    early_reporter = Assessment.objects.filter(
        astronaut=astronaut, level="AMBER", symptom_score__gte=1, vision_check__taken_at__date__lte=today_
    ).exists()
    earned = {
        "FIRST_TEST": len(check_dates) >= 1,
        "STREAK_4": streak >= config.BADGE_STREAK_4,
        "STREAK_12": streak >= config.BADGE_STREAK_12,
        "DAILY_LOG_30": DailyLog.objects.filter(astronaut=astronaut, date__lte=today_).count() >= config.BADGE_DAILY_LOGS,
        "EARLY_REPORTER": early_reporter,
    }
    day = mission.mission_day(today_)
    return {
        "astronaut_id": astronaut.pk,
        "as_of": today_,
        "streak_weeks": streak,
        "tests_completed": len(check_dates),
        "next_test_due": next_due,
        "overdue": today_ > next_due,
        "badges": [{"code": code, "name": name, "earned": earned[code]} for code, name in BADGES],
        "mission_progress": {
            "day": day,
            "planned": mission.planned_duration_days,
            "pct": float((Decimal(day) * 100 / mission.planned_duration_days).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
        },
    }
