"""Eye assessment engine (docs/04 §2–3). Pure functions: plain data in, AssessmentResult out.

No database access here. checks.services.submit_check (T6) loads the data, calls
`assess()`, and saves the result as a scoring.Assessment. Every number comes from
scoring/config.py.

Scales (docs/02 §2): near vision 1–10 and contrast 1–8, higher = better.
Drift = baseline − current, so positive drift = worse.
"""
import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from core.enums import Eye, Level

from . import config
from .exceptions import NoBaselineError

EYES = ("left", "right")
TWO_PLACES = Decimal("0.01")

# Insight texts end with this: NASA's pages don't link these factors to SANS (docs/08 "Known gap").
PATTERN_NOTE = "This is a pattern we noticed, not a proven cause."


# --- Inputs -----------------------------------------------------------------

@dataclass(frozen=True)
class CheckInput:
    """The new, non-baseline check being scored."""

    taken_on: date
    near_vision_left: int
    near_vision_right: int
    contrast_left: int
    contrast_right: int
    amsler_left: tuple = ()
    amsler_right: tuple = ()
    headache: int = 0
    eye_pressure: int = 0
    blur: int = 0


@dataclass(frozen=True)
class BaselineInput:
    """The astronaut's pre-flight averages (Decimal or number, e.g. 8.33)."""

    near_vision_left: Decimal
    near_vision_right: Decimal
    contrast_left: Decimal
    contrast_right: Decimal


@dataclass(frozen=True)
class PreviousCheck:
    """An earlier scored check, only the parts the rules look at."""

    near_vision_left: int
    near_vision_right: int
    amsler_left: tuple = ()
    amsler_right: tuple = ()


@dataclass(frozen=True)
class CabinDay:
    date: date
    co2_mmhg: Decimal


@dataclass(frozen=True)
class LifestyleDay:
    date: date
    sodium_mg: int | None = None
    exercise_min: int | None = None


@dataclass(frozen=True)
class Context:
    """Everything besides the check itself (docs/04 §2).

    previous_checks: earlier scored checks, oldest → newest (any number; the engine
    takes the last TREND_CHECKS). Logs may cover any dates; the engine keeps only the
    lookback window: the N days before the check date, not including the check day.
    """

    baseline: BaselineInput | None
    previous_checks: tuple = ()
    cabin_logs: tuple = ()
    daily_logs: tuple = ()
    gravity_g: Decimal = Decimal("0")
    test_interval_days: int = 7


# --- Output -----------------------------------------------------------------

@dataclass
class AssessmentResult:
    """Fields match scoring.Assessment (docs/02 §3.6), plus the trend flags for transparency."""

    level: str
    near_drift_left: Decimal
    near_drift_right: Decimal
    contrast_drift_left: Decimal
    contrast_drift_right: Decimal
    worse_eye: str | None
    symptom_score: int
    new_amsler_left: bool
    new_amsler_right: bool
    reasons: list = field(default_factory=list)
    actions: list = field(default_factory=list)
    env_insights: list = field(default_factory=list)
    escalate_to_earth: bool = False
    next_test_due: date | None = None
    declining_left: bool = False
    declining_right: bool = False

    def model_fields(self):
        """The fields to store on scoring.Assessment."""
        data = dict(self.__dict__)
        data.pop("declining_left")
        data.pop("declining_right")
        return data


# --- Helpers ----------------------------------------------------------------

def _dec(value):
    return value if isinstance(value, Decimal) else Decimal(str(value))


def _round2(value):
    return _dec(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _amount(value):
    """2 → "2", 1.50 → "1.5", 1.33 → "1.33" for reason sentences."""
    text = f"{_round2(value):f}"
    return text.rstrip("0").rstrip(".") if "." in text else text


def _plural(value, word):
    return word if _dec(value) == 1 else f"{word}s"


def gravity_multiplier(gravity_g):
    """Step 2: the multiplier for the first GRAVITY_STRICTNESS bound ≥ gravity_g."""
    g = _dec(gravity_g)
    for upper_bound, multiplier in sorted(config.GRAVITY_STRICTNESS.items()):
        if g <= _dec(upper_bound):
            return _dec(multiplier)
    return _dec(config.GRAVITY_STRICTNESS[max(config.GRAVITY_STRICTNESS)])


def _in_lookback(day, check_date, lookback_days):
    return check_date - timedelta(days=lookback_days) <= day < check_date


# --- Steps (docs/04 §3) -----------------------------------------------------

def _drifts(check, baseline):
    """Step 1: baseline − current per eye, 2 decimals."""
    return {
        ("near", eye): _round2(_dec(getattr(baseline, f"near_vision_{eye}")) - getattr(check, f"near_vision_{eye}"))
        for eye in EYES
    } | {
        ("contrast", eye): _round2(_dec(getattr(baseline, f"contrast_{eye}")) - getattr(check, f"contrast_{eye}"))
        for eye in EYES
    }


def _thresholds(gravity_g):
    """Step 2: drift thresholds scaled for gravity (symptom thresholds are not)."""
    m = gravity_multiplier(gravity_g)
    return {
        ("near", "amber"): _dec(config.NEAR_DRIFT_AMBER) * m,
        ("near", "red"): _dec(config.NEAR_DRIFT_RED) * m,
        ("contrast", "amber"): _dec(config.CONTRAST_DRIFT_AMBER) * m,
        ("contrast", "red"): _dec(config.CONTRAST_DRIFT_RED) * m,
    }


def _amsler(check, previous_check):
    """Step 3: marks now (any) and marks now that the previous check didn't have (new)."""
    any_marks, new_marks = {}, {}
    for eye in EYES:
        now = len(getattr(check, f"amsler_{eye}")) > 0
        before = previous_check is not None and len(getattr(previous_check, f"amsler_{eye}")) > 0
        any_marks[eye] = now
        new_marks[eye] = now and not before
    return any_marks, new_marks


def _declining(check, previous_checks):
    """Step 5: over ≥ TREND_CHECKS points (oldest → newest) near vision never improves
    and drops by ≥ 1 in total. Returns ({eye: bool}, number of points looked at)."""
    recent = list(previous_checks)[-config.TREND_CHECKS:]
    result, points = {}, len(recent) + 1
    for eye in EYES:
        series = [getattr(p, f"near_vision_{eye}") for p in recent] + [getattr(check, f"near_vision_{eye}")]
        never_improves = all(later <= earlier for earlier, later in zip(series, series[1:]))
        result[eye] = len(series) >= config.TREND_CHECKS and never_improves and series[0] - series[-1] >= 1
    return result, points


def _level(drifts, limits, any_marks, new_marks, declining, symptom_score):
    """Step 6."""
    worst_near = max(drifts[("near", e)] for e in EYES)
    worst_contrast = max(drifts[("contrast", e)] for e in EYES)
    if (
        worst_near >= limits[("near", "red")]
        or worst_contrast >= limits[("contrast", "red")]
        or any(new_marks.values())
        or symptom_score >= config.SYMPTOM_RED
    ):
        return Level.RED
    if (
        worst_near >= limits[("near", "amber")]
        or worst_contrast >= limits[("contrast", "amber")]
        or any(declining.values())
        or any(any_marks.values())
        or symptom_score >= config.SYMPTOM_AMBER
    ):
        return Level.AMBER
    return Level.GREEN


def _worse_eye(drifts, any_marks):
    """Step 7: per eye, near drift + contrast drift + 2 if Amsler marks."""
    score = {
        eye: drifts[("near", eye)] + drifts[("contrast", eye)] + (2 if any_marks[eye] else 0) for eye in EYES
    }
    if score["left"] < 1 and score["right"] < 1:
        return None
    if abs(score["left"] - score["right"]) < Decimal("0.5"):
        return Eye.BOTH
    return Eye.LEFT if score["left"] > score["right"] else Eye.RIGHT


def _reasons(check, drifts, limits, any_marks, new_marks, declining, points, symptom_score):
    """Step 8: one plain sentence per triggered rule."""
    reasons = []
    for eye in EYES:
        d = drifts[("near", eye)]
        if d >= limits[("near", "amber")]:
            reasons.append(f"{eye.capitalize()} eye near vision is {_amount(d)} {_plural(d, 'line')} below your normal.")
    for eye in EYES:
        d = drifts[("contrast", eye)]
        if d >= limits[("contrast", "amber")]:
            reasons.append(f"{eye.capitalize()} eye contrast is {_amount(d)} {_plural(d, 'level')} below your normal.")
    for eye in EYES:
        if new_marks[eye]:
            reasons.append(f"New wavy or missing area on the {eye}-eye grid.")
        elif any_marks[eye]:
            reasons.append(f"Wavy area still present on the {eye}-eye grid.")
    for eye in EYES:
        if declining[eye]:
            reasons.append(f"{eye.capitalize()} eye vision has dropped over your last {points} tests.")
    if symptom_score >= config.SYMPTOM_AMBER:
        reported = [name for name, value in (("headache", check.headache), ("eye pressure", check.eye_pressure),
                                             ("blur", check.blur)) if value > 0]
        listed = reported[0] if len(reported) == 1 else ", ".join(reported[:-1]) + " and " + reported[-1]
        reasons.append(f"You reported {listed} (score {symptom_score}/9).")
    return reasons or ["Your vision matches your normal. Keep it up."]


def _env_insights(check_date, context):
    """Step 9 (caller only uses this for AMBER/RED). Missing data → that insight is skipped."""
    insights = []

    cabin = [c for c in context.cabin_logs if _in_lookback(c.date, check_date, config.CO2_LOOKBACK_DAYS)]
    high_days = sum(1 for c in cabin if _dec(c.co2_mmhg) > _dec(config.CO2_HIGH_MMHG))
    if cabin and high_days >= config.CO2_HIGH_DAYS_TRIGGER:
        avg = sum(_dec(c.co2_mmhg) for c in cabin) / len(cabin)
        insights.append({
            "factor": "CO2",
            "text": f"This change followed {high_days} days of high cabin CO₂. {PATTERN_NOTE}",
            "value": float(avg.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)),
            "normal": config.CO2_NORMAL_MMHG,
        })

    days = [d for d in context.daily_logs if _in_lookback(d.date, check_date, config.LIFESTYLE_LOOKBACK_DAYS)]
    sodium = [d.sodium_mg for d in days if d.sodium_mg is not None]
    if sodium and sum(sodium) / len(sodium) > config.SODIUM_HIGH_MG:
        insights.append({
            "factor": "SODIUM",
            "text": f"Salt intake has been high this week. {PATTERN_NOTE}",
            "value": round(sum(sodium) / len(sodium)),
            "normal": config.SODIUM_NORMAL_MG,
        })
    exercise = [d.exercise_min for d in days if d.exercise_min is not None]
    if exercise and sum(exercise) / len(exercise) < config.EXERCISE_LOW_MIN:
        insights.append({
            "factor": "EXERCISE",
            "text": f"Exercise has been below target this week. {PATTERN_NOTE}",
            "value": round(sum(exercise) / len(exercise)),
            "normal": config.EXERCISE_TARGET_MIN,
        })
    return insights


def _action(code, text, priority):
    return {"code": code, "text": text, "priority": priority}


def _actions(level, insights, symptom_score, test_interval_days):
    """Step 10, sorted by priority (1 = most urgent; ties keep this order)."""
    retest = _action("RETEST_48H", f"Retest within {config.RETEST_HOURS_FLAGGED} hours.", 2)
    if level == Level.GREEN:
        actions = [_action("NEXT_WEEKLY", f"Next test in {test_interval_days} days.", 3)]
    elif level == Level.AMBER:
        actions = [retest, _action("NOTIFY_MO", "Let the Crew Medical Officer know.", 2)]
    else:
        actions = [
            _action("NOTIFY_MO_NOW", "Tell the Crew Medical Officer now.", 1),
            _action("ESCALATE_EARTH", "A priority note will go to the flight surgeon.", 1),
            retest,
        ]
    factors = {i["factor"] for i in insights}
    if "CO2" in factors:
        actions.append(_action("CHECK_CO2", "Ask for a CO₂ scrubber check.", 2))
    if "SODIUM" in factors:
        actions.append(_action("REDUCE_SALT", "Choose lower-salt meals this week.", 3))
    if "EXERCISE" in factors:
        actions.append(_action("EXERCISE", "Get back to your exercise target.", 3))
    if symptom_score >= config.SYMPTOM_AMBER:
        actions.append(_action("LOG_SYMPTOMS", "Note when the symptoms happen.", 3))
    return sorted(actions, key=lambda a: a["priority"])


def _next_test_due(level, check_date, test_interval_days):
    """Step 11: GREEN → routine interval; AMBER/RED → within RETEST_HOURS_FLAGGED (as a date)."""
    if level == Level.GREEN:
        return check_date + timedelta(days=test_interval_days)
    return check_date + timedelta(days=math.ceil(config.RETEST_HOURS_FLAGGED / 24))


# --- Entry point --------------------------------------------------------------

def assess(check: CheckInput, context: Context) -> AssessmentResult:
    """Score one non-baseline check (docs/04 §3). Raises NoBaselineError without a baseline."""
    if context.baseline is None:
        raise NoBaselineError()

    previous_check = context.previous_checks[-1] if context.previous_checks else None
    drifts = _drifts(check, context.baseline)                                  # 1
    limits = _thresholds(context.gravity_g)                                    # 2
    any_marks, new_marks = _amsler(check, previous_check)                      # 3
    symptom_score = check.headache + check.eye_pressure + check.blur           # 4
    declining, points = _declining(check, context.previous_checks)             # 5
    level = _level(drifts, limits, any_marks, new_marks, declining, symptom_score)  # 6
    insights = _env_insights(check.taken_on, context) if level != Level.GREEN else []  # 9

    return AssessmentResult(
        level=level.value,
        near_drift_left=drifts[("near", "left")],
        near_drift_right=drifts[("near", "right")],
        contrast_drift_left=drifts[("contrast", "left")],
        contrast_drift_right=drifts[("contrast", "right")],
        worse_eye=(eye.value if (eye := _worse_eye(drifts, any_marks)) else None),       # 7
        symptom_score=symptom_score,
        new_amsler_left=new_marks["left"],
        new_amsler_right=new_marks["right"],
        reasons=_reasons(check, drifts, limits, any_marks, new_marks, declining, points, symptom_score),  # 8
        actions=_actions(level, insights, symptom_score, context.test_interval_days),  # 10
        env_insights=insights,
        escalate_to_earth=level == Level.RED,
        next_test_due=_next_test_due(level, check.taken_on, context.test_interval_days),  # 11
        declining_left=declining["left"],
        declining_right=declining["right"],
    )
