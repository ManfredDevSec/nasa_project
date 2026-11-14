"""Every scoring threshold lives here (docs/04 §1, docs/01 §5: never hard-code numbers in logic).

All values are DEMO VALUES chosen to be sensible and explainable. They are not clinical
standards; a real system would tune them with NASA flight surgeons (docs/07 §3).
The only number backed by a NASA source is Mars gravity (see GRAVITY_STRICTNESS).
"""

# --- Eyes -------------------------------------------------------------------
NEAR_DRIFT_AMBER = 1.0        # demo value: lines below baseline
NEAR_DRIFT_RED = 2.0          # demo value
CONTRAST_DRIFT_AMBER = 1.0    # demo value: contrast levels below baseline
CONTRAST_DRIFT_RED = 2.0      # demo value
SYMPTOM_AMBER = 3             # demo value: headache + eye_pressure + blur (0–9)
SYMPTOM_RED = 6               # demo value
TREND_CHECKS = 3              # demo value: look at the last N scored checks for a steady decline

RETEST_HOURS_FLAGGED = 48     # demo value: retest window for AMBER/RED

# Gravity adjustment: microgravity is strictest (most headward fluid shift).
# The four drift thresholds are MULTIPLIED by this, so partial gravity is a bit more lenient.
# Key = upper bound of gravity_g (in g), value = multiplier. Multipliers are demo values.
GRAVITY_STRICTNESS = {
    0.05: 1.0,    # station / transit (microgravity, gravity_g 0.00)
    0.25: 1.1,    # Moon (gravity_g 0.17: demo value)
    0.50: 1.2,    # Mars (gravity_g 0.38) # Source: NASA HRP, 5 Hazards (docs/08 R3): Mars ≈ 3/8 (0.375) g
    1.00: 1.3,
}

# --- Environment insights (only shown for AMBER/RED) -------------------------
# NASA's pages do NOT link CO₂ or salt to SANS (docs/08 "Known gap"), so these are
# reported as patterns, never as causes.
CO2_NORMAL_MMHG = 2.5         # demo value
CO2_HIGH_MMHG = 3.5           # demo value: a day counts as "high" above this
CO2_LOOKBACK_DAYS = 7         # demo value
CO2_HIGH_DAYS_TRIGGER = 3     # demo value: ≥3 high days in the lookback → insight
SODIUM_NORMAL_MG = 2300       # demo value
SODIUM_HIGH_MG = 3500         # demo value: average over the lookback
EXERCISE_TARGET_MIN = 90      # demo value
EXERCISE_LOW_MIN = 60         # demo value: average over the lookback
LIFESTYLE_LOOKBACK_DAYS = 7   # demo value

# --- Vitals (docs/04 §4) -----------------------------------------------------
HR_GREEN = (50, 100)                         # demo value, bpm inclusive
HR_AMBER = (40, 120)                         # demo value: outside this → RED
SYS_AMBER, SYS_RED = 130, 140                # demo values, mmHg (systolic ≥ value)
DIA_AMBER, DIA_RED = 85, 90                  # demo values, mmHg (diastolic ≥ value)
SLEEP_GREEN_MIN, SLEEP_RED_BELOW = 7.0, 5.0  # demo values, hours: 5–6.9 → AMBER
MOOD_GREEN_MIN, MOOD_RED_MAX = 4, 2          # demo values, 1–5 scale: 3 → AMBER

# --- Engagement / gamification (docs/04 §6) -------------------------------------
STREAK_WINDOW_DAYS = 7        # a "week" of the streak: 7-day windows counting back from today
BADGE_STREAK_4 = 4            # demo value: weeks
BADGE_STREAK_12 = 12          # demo value: weeks
BADGE_DAILY_LOGS = 30         # demo value: daily logs

# --- Trends (docs/03 R2) ------------------------------------------------------------
TRENDS_DEFAULT_DAYS = 90
TRENDS_MAX_DAYS = 1000

# --- Crew overview + weekly report (docs/03 R4–R5) ----------------------------------
# Cabin CO₂ traffic light (spec gives no rule): GREEN up to CO2_HIGH_MMHG, AMBER above it,
# RED above CO2_RED_MMHG. Example in docs/03 R4: 4.1 mmHg → AMBER.
CO2_RED_MMHG = 5.0            # demo value
CO2_OVERVIEW_AVG_DAYS = 5     # "co2_5day_avg"
WEEKLY_REPORT_DAYS = 7        # week = week_ending and the 6 days before
