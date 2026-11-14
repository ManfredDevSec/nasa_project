from dataclasses import dataclass

from django.conf import settings


@dataclass
class Evaluation:
    level: str  # "GREEN" | "AMBER" | "RED"
    reasons: list
    actions: list
    env_insight: str
    flags: set


_LEVEL_ORDER = {"GREEN": 0, "AMBER": 1, "RED": 2}


def evaluate(current, baseline, previous, env_logs, thresholds=None):
    if thresholds is None:
        thresholds = settings.SIGHTLINE_THRESHOLDS

    if baseline is None:
        return Evaluation(
            level="AMBER",
            reasons=["No baseline on file — complete pre-launch baseline tests"],
            actions=["Tell the Crew Medical Officer"],
            env_insight="",
            flags=set(),
        )

    t = thresholds
    triggers = []
    flags = set()

    drift = round(current.near_vision - baseline.near_vision, 10)
    lines = round(drift / 0.1)
    if drift >= t["near_drift_red"]:
        triggers.append(("RED", f"Near vision is {lines} lines worse than your normal"))
    elif drift >= t["near_drift_amber"]:
        triggers.append(("AMBER", f"Near vision is {lines} lines worse than your normal"))

    contrast_drop = round(baseline.contrast - current.contrast, 10)
    if contrast_drop >= t["contrast_drop_red"]:
        triggers.append(("RED", "Contrast vision is lower than your normal"))
    elif contrast_drop >= t["contrast_drop_amber"]:
        triggers.append(("AMBER", "Contrast vision is lower than your normal"))

    if (
        len(previous) >= 2
        and previous[-2].near_vision < previous[-1].near_vision < current.near_vision
    ):
        triggers.append(("AMBER", "Near vision has got worse in each of your last 3 tests"))

    prev_check = previous[-1] if previous else None
    for eye in ("left", "right"):
        attr = f"amsler_{eye}"
        current_marks = bool(getattr(current, attr))
        prev_marks = bool(getattr(prev_check, attr)) if prev_check is not None else False
        if current_marks:
            if prev_marks:
                triggers.append(("RED", f"Wavy lines seen on the grid again ({eye} eye)"))
            else:
                triggers.append(("AMBER", f"New wavy lines on the grid ({eye} eye)"))
                flags.add("new_distortion")

    symptom_total = current.headache + current.eye_pressure + current.blur
    if symptom_total >= t["symptoms_red"]:
        triggers.append(("RED", f"Symptom score {symptom_total} of 9"))
    elif symptom_total >= t["symptoms_amber"]:
        triggers.append(("AMBER", f"Symptom score {symptom_total} of 9"))

    if triggers:
        level = max((lv for lv, _ in triggers), key=lambda x: _LEVEL_ORDER[x])
        reasons = [r for _, r in triggers]
    else:
        level = "GREEN"
        reasons = ["Vision matches your normal"]

    env_insight = ""
    env_flags = set()
    if level in ("AMBER", "RED") and env_logs:
        n = len(env_logs)
        avg_co2 = sum(e.co2_mmhg for e in env_logs) / n
        avg_sodium = sum(e.sodium_mg for e in env_logs) / n
        avg_exercise = sum(e.exercise_min for e in env_logs) / n

        insights = []
        if avg_co2 > t["co2_mmhg_high"]:
            days_high = sum(1 for e in env_logs if e.co2_mmhg > t["co2_mmhg_high"])
            insights.append(
                f"Drop followed {days_high} days of high cabin CO₂ (avg {avg_co2:.1f} mmHg)"
            )
            env_flags.add("co2")
        if avg_sodium > t["sodium_mg_high"]:
            insights.append(
                f"Drop followed high sodium intake (avg {avg_sodium:.0f} mg/day)"
            )
            env_flags.add("sodium")
        if avg_exercise < t["exercise_min_low"]:
            insights.append(
                f"Drop followed low exercise (avg {avg_exercise:.0f} min/day)"
            )
            env_flags.add("exercise")
        env_insight = "; ".join(insights)

    flags |= env_flags

    if level == "GREEN":
        actions = ["Next test in 7 days"]
    elif level == "AMBER":
        if "new_distortion" in flags:
            actions = ["Retest the grid within 24 hours", "Tell the Crew Medical Officer"]
        else:
            actions = ["Retest in 48 hours", "Tell the Crew Medical Officer"]
    else:
        actions = ["Tell the Crew Medical Officer now", "Send a priority note to Earth"]

    if level in ("AMBER", "RED"):
        if "co2" in env_flags:
            actions.append("Flag CO₂ scrubbers for a check")
        if "sodium" in env_flags:
            actions.append("Review sodium in the meal plan")
        if "exercise" in env_flags:
            actions.append("Get back to your daily exercise target")

    return Evaluation(
        level=level,
        reasons=reasons,
        actions=actions,
        env_insight=env_insight,
        flags=flags,
    )
