"""Vitals rules (docs/04 §4). Pure functions: values in, {"level", "text"} out.

Used for the `vitals_status` block of POST /daily-logs/ (docs/03 D1) and the body map's
HEART / SLEEP / MIND parts (T9). A missing value gives UNKNOWN. Thresholds are demo
values from scoring/config.py; the texts are app guidance, not medical advice.
"""
from decimal import Decimal

from core.enums import UNKNOWN, Level

from . import config

_ORDER = {UNKNOWN: -1, Level.GREEN: 0, Level.AMBER: 1, Level.RED: 2}


def _status(level, text):
    return {"level": str(level), "text": text}


def _unknown(what):
    return _status(UNKNOWN, f"No {what} logged yet.")


def worse(*statuses):
    """The most serious of several statuses, ignoring UNKNOWN unless all are unknown."""
    return max(statuses, key=lambda s: _ORDER[s["level"]])


def heart_rate_status(bpm):
    if bpm is None:
        return _unknown("resting heart rate")
    green_low, green_high = config.HR_GREEN
    amber_low, amber_high = config.HR_AMBER
    if green_low <= bpm <= green_high:
        return _status(Level.GREEN, f"Resting heart rate {bpm} bpm: normal.")
    if amber_low <= bpm <= amber_high:
        return _status(Level.AMBER, f"Resting heart rate {bpm} bpm: outside the usual range. Measure again later.")
    return _status(Level.RED, f"Resting heart rate {bpm} bpm: well outside the usual range. Tell the Medical Officer.")


def blood_pressure_status(systolic, diastolic):
    """Needs both numbers; with only one the status is UNKNOWN."""
    if systolic is None or diastolic is None:
        return _unknown("blood pressure")
    reading = f"{systolic}/{diastolic}"
    if systolic >= config.SYS_RED or diastolic >= config.DIA_RED:
        return _status(
            Level.RED, f"Blood pressure {reading} is high. Rest 10 minutes and measure again; tell the Medical Officer."
        )
    if systolic >= config.SYS_AMBER or diastolic >= config.DIA_AMBER:
        return _status(Level.AMBER, f"Blood pressure {reading} is a little high. Measure again later today.")
    return _status(Level.GREEN, f"Blood pressure {reading}: normal.")


def sleep_status(hours):
    if hours is None:
        return _unknown("sleep")
    h = Decimal(str(hours))
    shown = f"{h:.1f}"
    if h >= Decimal(str(config.SLEEP_GREEN_MIN)):
        return _status(Level.GREEN, f"{shown} h sleep: on target.")
    if h >= Decimal(str(config.SLEEP_RED_BELOW)):
        return _status(Level.AMBER, f"{shown} h sleep: below target. Try to protect your sleep window tonight.")
    return _status(Level.RED, f"{shown} h sleep: far below target. Talk to the Medical Officer about your schedule.")


def mood_status(mood):
    if mood is None:
        return _unknown("mood")
    if mood >= config.MOOD_GREEN_MIN:
        return _status(Level.GREEN, f"Mood {mood}/5: good.")
    if mood > config.MOOD_RED_MAX:
        return _status(Level.AMBER, "Mood is lower than usual. Consider a talk with crew or family.")
    return _status(Level.RED, "Mood is low. Talk to the Medical Officer or schedule a private call home.")


def vitals_status(resting_hr_bpm=None, systolic_mmhg=None, diastolic_mmhg=None, sleep_hours=None, mood=None, **_):
    """The `vitals_status` block (docs/03 D1). Accepts a DailyLog's values as keywords."""
    return {
        "heart": heart_rate_status(resting_hr_bpm),
        "blood_pressure": blood_pressure_status(systolic_mmhg, diastolic_mmhg),
        "sleep": sleep_status(sleep_hours),
        "mood": mood_status(mood),
    }


def heart_part_status(resting_hr_bpm=None, systolic_mmhg=None, diastolic_mmhg=None):
    """Body map HEART = the worse of heart rate and blood pressure (docs/04 §4)."""
    return worse(heart_rate_status(resting_hr_bpm), blood_pressure_status(systolic_mmhg, diastolic_mmhg))
