# 04 — Scoring Rules
**Where:** `scoring/engine.py` (eyes), `scoring/vitals_rules.py` (vitals), `scoring/config.py` (all numbers)

> ⚠️ All thresholds are **demo values** chosen to be sensible and explainable. They are not clinical standards. In the pitch: "would be tuned with NASA flight surgeons."

---

## 1. `config.py` (single source of truth)

```python
# --- Eyes ---
NEAR_DRIFT_AMBER = 1.0        # lines below baseline
NEAR_DRIFT_RED = 2.0
CONTRAST_DRIFT_AMBER = 1.0    # levels below baseline
CONTRAST_DRIFT_RED = 2.0
SYMPTOM_AMBER = 3             # headache + eye_pressure + blur (0–9)
SYMPTOM_RED = 6
TREND_CHECKS = 3              # look at last N scored checks for steady decline

RETEST_HOURS_FLAGGED = 48     # for AMBER/RED

# Gravity adjustment: microgravity = strictest (most fluid shift).
# Drift thresholds are MULTIPLIED by this, so partial gravity is a bit more lenient.
GRAVITY_STRICTNESS = {        # gravity_g upper bound -> multiplier
    0.05: 1.0,    # station / transit (microgravity)
    0.25: 1.1,    # Moon
    0.50: 1.2,    # Mars
    1.00: 1.3,
}

# --- Environment insight ---
CO2_NORMAL_MMHG = 2.5
CO2_HIGH_MMHG = 3.5           # day counts as "high" above this
CO2_LOOKBACK_DAYS = 7
CO2_HIGH_DAYS_TRIGGER = 3     # ≥3 high days in lookback → insight
SODIUM_NORMAL_MG = 2300
SODIUM_HIGH_MG = 3500         # avg over lookback
EXERCISE_TARGET_MIN = 90
EXERCISE_LOW_MIN = 60         # avg over lookback
LIFESTYLE_LOOKBACK_DAYS = 7

# --- Vitals ---
HR_GREEN = (50, 100); HR_AMBER = (40, 120)                 # outside amber → RED
SYS_AMBER, SYS_RED = 130, 140
DIA_AMBER, DIA_RED = 85, 90
SLEEP_GREEN_MIN, SLEEP_RED_BELOW = 7.0, 5.0                 # 5–7 → AMBER
MOOD_GREEN_MIN, MOOD_RED_MAX = 4, 2                         # 3 → AMBER
```

> Before the demo, put a source next to each number in `07_SOURCES.md` where one exists.

---

## 2. Eye Assessment: Inputs

```
assess(check) uses:
  check            the new VisionCheck (is_baseline = False)
  baseline         astronaut's Baseline (required, else NO_BASELINE)
  previous_checks  last TREND_CHECKS scored checks before this one (may be fewer)
  previous_check   the most recent scored check (may be None)
  cabin_logs       mission CabinLogs in the CO2_LOOKBACK_DAYS before check date
  daily_logs       astronaut DailyLogs in the LIFESTYLE_LOOKBACK_DAYS before check date
  mission.gravity_g
```

## 3. Eye Assessment: Steps

**Step 1: Drift per eye**
```
near_drift_L     = baseline.near_vision_left  − check.near_vision_left
near_drift_R     = baseline.near_vision_right − check.near_vision_right
contrast_drift_L = baseline.contrast_left     − check.contrast_left
contrast_drift_R = baseline.contrast_right    − check.contrast_right
```
Round to 2 decimals. Positive = worse.

**Step 2: Adjust thresholds for gravity**
```
m = GRAVITY_STRICTNESS multiplier for mission.gravity_g
near_amber = NEAR_DRIFT_AMBER * m ... (same for all four drift thresholds)
```
(Microgravity m = 1.0 → base thresholds. Moon/Mars → slightly higher thresholds, because there's less fluid shift.)

**Step 3: Amsler**
```
new_amsler_L = len(check.amsler_left) > 0  and (previous_check is None or len(previous_check.amsler_left) == 0)
new_amsler_R = same for right
any_amsler_L = len(check.amsler_left) > 0
```

**Step 4: Symptoms**
`symptom_score = headache + eye_pressure + blur`

**Step 5: Trend (steady decline)**
For each eye: in `previous_checks + [check]` (oldest → newest), if there are ≥ TREND_CHECKS points and near_vision **never improves and drops by ≥ 1 in total**, then `declining_L/R = True`.

**Step 6: Level**
```
RED if any of:
  max(near_drift_L, near_drift_R)     >= near_red
  max(contrast_drift_L, contrast_drift_R) >= contrast_red
  new_amsler_L or new_amsler_R
  symptom_score >= SYMPTOM_RED

else AMBER if any of:
  max(near_drift_L, near_drift_R)     >= near_amber
  max(contrast_drift_L, contrast_drift_R) >= contrast_amber
  declining_L or declining_R
  any_amsler_L or any_amsler_R        (existing, not new)
  symptom_score >= SYMPTOM_AMBER

else GREEN
```

**Step 7: Worse eye**
Score per eye = near_drift + contrast_drift + (2 if amsler marks present).
If both < 1 → null. If difference < 0.5 → `BOTH`. Else the higher one: `LEFT` / `RIGHT`.

**Step 8: Reasons** (one plain sentence per triggered rule)

| Trigger | Reason text |
|---|---|
| near drift ≥ amber | "{Left/Right} eye near vision is {n} line(s) below your normal." |
| contrast drift ≥ amber | "{Eye} eye contrast is {n} level(s) below your normal." |
| new amsler | "New wavy or missing area on the {eye}-eye grid." |
| existing amsler | "Wavy area still present on the {eye}-eye grid." |
| declining | "{Eye} eye vision has dropped over your last {N} tests." |
| symptoms | "You reported headache / eye pressure / blur (score {s}/9)." |
| GREEN, nothing triggered | "Your vision matches your normal. Keep it up." |

**Step 9: Environment insights** (only if AMBER or RED)

| Check | Insight |
|---|---|
| ≥ CO2_HIGH_DAYS_TRIGGER days with co2 > CO2_HIGH_MMHG in lookback | `CO2`: "This change followed {d} days of high cabin CO₂." value = lookback avg |
| avg sodium > SODIUM_HIGH_MG | `SODIUM`: "Salt intake has been high this week." |
| avg exercise < EXERCISE_LOW_MIN | `EXERCISE`: "Exercise has been below target this week." |

Missing data → skip that insight silently.

**Step 10: Actions**

| Level / condition | Actions (code: text: priority) |
|---|---|
| GREEN | `NEXT_WEEKLY`: "Next test in {interval} days.": 3 |
| AMBER | `RETEST_48H`: "Retest within 48 hours.": 2 · `NOTIFY_MO`: "Let the Crew Medical Officer know.": 2 |
| RED | `NOTIFY_MO_NOW`: "Tell the Crew Medical Officer now.": 1 · `ESCALATE_EARTH`: "A priority note will go to the flight surgeon.": 1 · `RETEST_48H`: 2 |
| + CO2 insight | `CHECK_CO2`: "Ask for a CO₂ scrubber check.": 2 |
| + SODIUM insight | `REDUCE_SALT`: "Choose lower-salt meals this week.": 3 |
| + EXERCISE insight | `EXERCISE`: "Get back to your exercise target.": 3 |
| symptoms ≥ AMBER | `LOG_SYMPTOMS`: "Note when the symptoms happen.": 3 |

Sort by priority. `escalate_to_earth = (level == RED)`.

**Step 11: Next test due**
GREEN → check date + `astronaut.test_interval_days` · AMBER/RED → check date + 48 h (as a date).

---

## 4. Vitals Rules (`vitals_rules.py`)

| Part | GREEN | AMBER | RED |
|---|---|---|---|
| Heart rate (bpm) | 50–100 | 40–49 or 101–120 | <40 or >120 |
| Blood pressure | sys <130 and dia <85 | sys 130–139 or dia 85–89 | sys ≥140 or dia ≥90 |
| Sleep (h) | ≥7 | 5–6.9 | <5 |
| Mood (1–5) | 4–5 | 3 | 1–2 |

Body map `HEART` = worse of heart rate and BP. Missing value → `UNKNOWN`.

Guidance text examples:
- Sleep AMBER: "Below sleep target. Try to protect your sleep window tonight."
- Mood RED: "Mood is low. Talk to the Medical Officer or schedule a private call home."
- BP RED: "Blood pressure is high. Rest 10 minutes and measure again; tell the Medical Officer."

---

## 5. Worked Test Cases (must be in `scoring/tests.py`)

Baseline for all cases: near L/R = 8 / 8, contrast L/R = 6 / 6. Microgravity (m = 1.0). No prior checks unless stated.

| # | Input (near L,R / contrast L,R / amsler L,R / symptoms) | Extra context | Expected level | Expected key reason / flag |
|---|---|---|---|---|
| 1 | 8,8 / 6,6 / [],[] / 0 | none | GREEN | worse_eye null |
| 2 | 7,8 / 6,6 / [],[] / 0 | | AMBER | Left near drift 1; worse_eye LEFT |
| 3 | 6,8 / 6,6 / [],[] / 0 | | RED | Left near drift 2 |
| 4 | 8,8 / 4,6 / [],[] / 0 | | RED | Left contrast drift 2 |
| 5 | 8,8 / 6,6 / [[3,4]],[] / 0 | previous check had no marks | RED | new_amsler_left |
| 6 | 8,8 / 6,6 / [[3,4]],[] / 0 | previous check had same marks | AMBER | existing amsler |
| 7 | 8,8 / 6,6 / [],[] / 3 | | AMBER | symptom score 3 |
| 8 | 8,8 / 6,6 / [],[] / 6 | | RED | symptom score 6 |
| 9 | 7,7 / 6,6 / [],[] / 0 | | AMBER | worse_eye BOTH |
| 10 | 7,8 / 6,6 / [],[] / 0 | 4 high-CO₂ days in last 7 | AMBER | env_insights has CO2; actions include CHECK_CO2 |
| 11 | 8,8 / 6,6 / [],[] / 0 | 4 high-CO₂ days | GREEN | **no** env insights (only for AMBER/RED) |
| 12 | prev checks 8 → 8 → 7, now 7,8 / 6,6 | | AMBER | declining_L reason |
| 13 | 7,8 / 6,6 / [],[] / 0 | Mars base (g = 0.38, m = 1.2 → amber threshold 1.2) | GREEN | same input as case 2, but lenient in partial gravity |
| 14 | any | no baseline | — | raises NoBaselineError → API 409 |

Vitals cases: HR 64 → GREEN; HR 115 → AMBER; BP 142/80 → RED; sleep 6.0 → AMBER; mood 2 → RED; all null → UNKNOWN.

---

## 6. Engagement Rules (`reports/services.py`)

| Item | Rule |
|---|---|
| `tests_completed` | count of scored checks |
| `streak_weeks` | consecutive 7-day windows (counting back from today) each containing ≥ 1 scored check |
| `next_test_due` | from latest Assessment; if none → mission start + interval |
| `overdue` | today > next_test_due |
| Badges | `FIRST_TEST` ≥1 test · `STREAK_4` streak ≥4 · `STREAK_12` streak ≥12 · `DAILY_LOG_30` ≥30 DailyLogs · `EARLY_REPORTER` any check with symptoms ≥1 that was AMBER (reported before RED) |
| `mission_progress.pct` | day / planned × 100, 1 decimal |
