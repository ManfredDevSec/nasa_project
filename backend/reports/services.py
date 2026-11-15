"""Computed reports (docs/01 §5: business logic lives here, not in views). No tables of their own.

T9: body map. T10/T11 add trends, engagement, crew overview and the weekly report here.
"""
from datetime import datetime, time, timedelta, timezone as dt_timezone
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Q
from django.utils import timezone

from checks.models import VisionCheck
from core.enums import LEVEL_ORDER, UNKNOWN, worst_level
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
        "astronaut": {"id": astronaut.pk, "name": astronaut.full_name, "call_sign": astronaut.call_sign},
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


def next_test_due(astronaut, as_of):
    """From the latest assessment; before any → mission start + interval (docs/04 §6)."""
    latest = latest_assessment_on(astronaut, as_of)
    if latest:
        return latest.next_test_due
    return astronaut.mission.start_date + timedelta(days=astronaut.test_interval_days)


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

    next_due = next_test_due(astronaut, today_)
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


# --- T11: crew overview (docs/03 R4) -----------------------------------------------------

def mission_reference_date(mission, as_of):
    return min(as_of, mission_end(mission))


def cabin_level(co2):
    if co2 is None:
        return UNKNOWN
    if co2 > Decimal(str(config.CO2_RED_MMHG)):
        return "RED"
    if co2 > Decimal(str(config.CO2_HIGH_MMHG)):
        return "AMBER"
    return "GREEN"


def _round1(value):
    return float(Decimal(value).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _crew_row(astronaut, as_of):
    parts = {p["part"]: p for p in body_map(astronaut, as_of)["parts"]}
    levels = {name.lower(): parts[name]["level"] for name in ("EYES", "HEART", "SLEEP", "MIND")}
    overall = worst_level(levels.values())
    due = next_test_due(astronaut, as_of)
    # Headline: the eye result's first reason when the eyes drive the status, else the worst vitals part.
    if overall in ("GREEN", UNKNOWN):
        headline = "All clear" if overall == "GREEN" else "No data yet"
    elif levels["eyes"] == overall:
        assessment = latest_assessment_on(astronaut, as_of)
        headline = assessment.reasons[0]
    else:
        part = next(n for n in ("HEART", "SLEEP", "MIND") if parts[n]["level"] == overall)
        headline = f"{part.capitalize()}: {parts[part]['summary']}"
    row = {
        "astronaut_id": astronaut.pk, "call_sign": astronaut.call_sign, "name": astronaut.full_name,
        **levels, "overall": overall,
        "headline": headline, "overdue": as_of > due, "next_test_due": due,
    }
    return row, parts


def _alerts_for(astronaut, row, parts):
    call = astronaut.call_sign
    alerts = []
    eyes = parts["EYES"]
    if eyes["level"] == "RED":
        alerts.append(("RED", f"{call}: escalate to Earth", row["headline"], eyes["last_updated"]))
    elif eyes["level"] == "AMBER":
        alerts.append(("AMBER", f"{call}: retest within {config.RETEST_HOURS_FLAGGED} hours", row["headline"], eyes["last_updated"]))
    for name in ("HEART", "SLEEP", "MIND"):
        if parts[name]["level"] == "RED":
            alerts.append(("RED", f"{call}: {name.lower()} needs attention", parts[name]["guidance"], parts[name]["last_updated"]))
    if row["overdue"]:
        alerts.append(("AMBER", f"{call}: eye test overdue", f"Was due {_short_date(row['next_test_due'])}.",
                       _day_start(row["next_test_due"])))
    return [{"astronaut_id": astronaut.pk, "call_sign": call, "level": level, "text": text, "detail": detail,
             "created_at": when}
            for level, text, detail, when in alerts]


def crew_overview(mission, as_of):
    as_of = mission_reference_date(mission, as_of)
    logs = list(CabinLog.objects.filter(mission=mission, date__lte=as_of).order_by("-date")[: config.CO2_OVERVIEW_AVG_DAYS])
    today_log = logs[0] if logs and logs[0].date == as_of else None
    co2_today = today_log.co2_mmhg if today_log else None
    cabin = {
        "co2_mmhg_today": co2_today,
        "co2_level": cabin_level(co2_today),
        "co2_5day_avg": _round1(sum(l.co2_mmhg for l in logs) / len(logs)) if logs else None,
    }

    crew, alerts, insights = [], [], []
    for astronaut in mission.astronauts.order_by("call_sign"):
        row, parts = _crew_row(astronaut, as_of)
        crew.append(row)
        alerts += _alerts_for(astronaut, row, parts)
        latest = latest_assessment_on(astronaut, as_of)
        if latest and latest.level in ("AMBER", "RED"):  # insights only exist for flagged results
            for insight in latest.env_insights:
                line = f"{astronaut.call_sign}: {insight['text']}"
                if line not in insights:
                    insights.append(line)
    if cabin["co2_level"] in ("AMBER", "RED"):
        alerts.append({"astronaut_id": None, "call_sign": None, "level": cabin["co2_level"],
                       "text": f"Cabin CO₂ above normal ({co2_today} mmHg)",
                       "detail": "Ask for a CO₂ scrubber check.", "created_at": _day_start(as_of)})

    crew.sort(key=lambda r: (-LEVEL_ORDER[r["overall"]], r["call_sign"]))  # worst first
    alerts.sort(key=lambda a: (-LEVEL_ORDER[a["level"]], a["astronaut_id"] is None))
    return {
        "mission": {"id": mission.pk, "name": mission.name, "is_active": mission.is_active},
        "as_of": as_of,
        "mission_day": mission.mission_day(as_of),
        "cabin": cabin,
        "crew": crew,
        "alerts": alerts,
        "insights": insights,
    }


# --- T11: weekly report for Earth (docs/03 R5) ----------------------------------------------

def _eye_phrase(worse_eye):
    return {"LEFT": "left-eye", "RIGHT": "right-eye", "BOTH": "both-eye"}.get(worse_eye, "eye")


def weekly_report(mission, week_ending):
    end = mission_reference_date(mission, week_ending)
    start = end - timedelta(days=config.WEEKLY_REPORT_DAYS - 1)

    logs = list(CabinLog.objects.filter(mission=mission, date__gte=start, date__lte=end))
    co2 = [l.co2_mmhg for l in logs]
    high = Decimal(str(config.CO2_HIGH_MMHG))
    environment = {
        "co2_avg": _round1(sum(co2) / len(co2)) if co2 else None,
        "co2_max": float(max(co2)) if co2 else None,
        "days_above_normal": sum(1 for v in co2 if v > high),
        "high_mark": config.CO2_HIGH_MMHG,
        "days_logged": len(co2),
    }

    crew_summary, insights, recommendations = [], [], []
    for astronaut in mission.astronauts.order_by("call_sign"):
        week = list(
            Assessment.objects.filter(astronaut=astronaut, vision_check__taken_at__date__gte=start,
                                      vision_check__taken_at__date__lte=end)
            .select_related("vision_check").order_by("vision_check__taken_at")
        )
        call = astronaut.call_sign
        if not week:
            crew_summary.append({"call_sign": call, "eyes": UNKNOWN, "tests": 0, "near_drift": None,
                                 "symptom_score": None, "new_amsler": [], "escalated": False})
            recommendations.append(f"{call} did no eye test this week: ask for one.")
            continue
        worst = max(week, key=lambda a: (LEVEL_ORDER[a.level], a.vision_check.taken_at))  # worst, latest on ties
        new_amsler = [eye for eye, flag in (("LEFT", any(a.new_amsler_left for a in week)),
                                            ("RIGHT", any(a.new_amsler_right for a in week))) if flag]
        crew_summary.append({
            "call_sign": call, "eyes": worst.level, "tests": len(week),
            "near_drift": {"left": worst.near_drift_left, "right": worst.near_drift_right},
            "symptom_score": worst.symptom_score, "new_amsler": new_amsler,
            "escalated": any(a.escalate_to_earth for a in week),
        })
        for insight in worst.env_insights:
            line = f"{call}: {insight['text']}"
            if line not in insights:
                insights.append(line)
        eye = _eye_phrase(worst.worse_eye)
        if worst.level == "RED":
            grid = " and Amsler grid" if new_amsler else ""
            recommendations.append(f"Review {call}'s {eye} trend{grid}.")
        elif worst.level == "AMBER":
            recommendations.append(f"Follow up on {call}'s {config.RETEST_HOURS_FLAGGED}-hour retest.")

    if environment["days_above_normal"] >= config.CO2_HIGH_DAYS_TRIGGER:
        recommendations.append(f"Cabin CO₂ was above {config.CO2_HIGH_MMHG} mmHg on "
                               f"{environment['days_above_normal']} days: ask for a scrubber status report.")
    if not recommendations:
        recommendations.append("No action needed this week.")

    crew_summary.sort(key=lambda r: (-LEVEL_ORDER[r["eyes"]], r["call_sign"]))
    return {
        "mission": {"id": mission.pk, "name": mission.name, "day_range": [mission.mission_day(start), mission.mission_day(end)],
                    "from": start, "to": end},
        "generated_at": timezone.now(),
        "crew_summary": crew_summary,
        "environment": environment,
        "insights": insights,
        "recommendations_for_surgeon": recommendations,
    }
