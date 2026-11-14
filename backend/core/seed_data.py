"""The demo story (docs/05_SEED_DATA_SPEC.md), as plain data. All people and numbers are simulated.

Core story (spec 05, unchanged): Ares Transit 1, today = day 92. CO₂ scrubber problem from day 78;
Commander Osei's left eye drifts: AMBER day 84, RED day 91 (new Amsler marks); Pilot Mensah stays
GREEN; Specialist Adjei (Medical Officer) has a brief AMBER around day 42.

Extended crew (added on request: 12 astronauts over 3 missions, mostly healthy, all with logins):
3 more on Ares Transit 1, plus two finished missions:
- Artemis Base 2 (Moon, 0.17 g): Agyeman's 1-line drop is GREEN on the Moon (gravity-adjusted
  thresholds, docs/04 step 2) once the downward trend stops.
- Gateway Station 9 (station): Bonsu has a RED episode during a CO₂ spike, then recovers.

Day numbers are mission days (day 1 = mission start; baselines are pre-flight, ≤ 0).
Value ranges are (low, high), drawn from a fixed random seed so every run is identical.
"""

# --- Missions ----------------------------------------------------------------
# `last_day`: None = the active mission, runs up to --today-day (default 92).
# `start_days_ago`: for finished missions, how long ago (before today) day 1 was.
# `co2`: (first day, last day, (low, high)) ranges; later ranges override earlier ones.
MISSIONS = [
    {
        "key": "gateway", "name": "Gateway Station 9", "environment": "STATION", "gravity_g": "0.00",
        "planned_duration_days": 180, "active": False, "start_days_ago": 800, "last_day": 180,
        "co2": [(1, 180, (2.3, 2.8)), (140, 158, (4.0, 4.8))],
    },
    {
        "key": "artemis", "name": "Artemis Base 2", "environment": "MOON_BASE", "gravity_g": "0.17",
        "planned_duration_days": 120, "active": False, "start_days_ago": 400, "last_day": 120,
        "co2": [(1, 120, (2.3, 2.8))],
    },
    {
        "key": "ares", "name": "Ares Transit 1", "environment": "TRANSIT", "gravity_g": "0.00",
        "planned_duration_days": 900, "active": True, "start_days_ago": None, "last_day": None,
        "co2": [(1, 77, (2.3, 2.7)), (78, 88, (4.2, 5.0)), (89, 92, (3.0, 3.4))],  # spec 05 §5
    },
]

# --- Daily log ranges (spec 05 §6) ------------------------------------------------
# Sleep 7.0–8.2 h (spec says 6.8–8.2; agreed fix so healthy crew stay GREEN on sleep).
NORMAL_DAILY = {
    "resting_hr_bpm": (58, 70), "systolic_mmhg": (110, 124), "diastolic_mmhg": (70, 80),
    "sleep_hours": (7.0, 8.2), "mood": (4, 5), "sodium_mg": (2600, 3200), "exercise_min": (90, 130),
}
SKIP_DAY_CHANCE = 0.05   # ~5 % of days missing (realistic gaps)
NEVER_SKIP_LAST_DAYS = 2  # spec 05 §6: never skip day 91 or 92 (the last two days)

# --- Astronauts ---------------------------------------------------------------------
# baseline: three pre-flight checks on days -30, -20, -10 (spec 05 §4), per field a list of 3.
# normal: the weekly check values when nothing special happens.
# checks: {day: changes} for weekly days, plus extra (retest) days.
# daily: [(first day, last day, {field: (low, high)})] overrides of NORMAL_DAILY.
# skip_check_days: weekly days with no check (Osei's day 92 is left empty anyway: weekly days stop at 91).
BASELINE_DAYS = (-30, -20, -10)
ASTRONAUTS = [
    # ---- Ares Transit 1 (active): the spec 05 story --------------------------------
    {
        "mission": "ares", "username": "osei", "full_name": "Ama Osei", "call_sign": "Osei", "crew_role": "COMMANDER",
        "baseline": {"near": ([8, 8, 8], [8, 9, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
        "checks": {
            77: {"symptoms": (1, 0, 0)},
            84: {"near": (7, 8), "symptoms": (1, 1, 1)},                                   # AMBER (+ CO₂)
            86: {"near": (7, 8), "contrast": (5, 6), "symptoms": (1, 1, 1)},               # retest: AMBER
            91: {"near": (6, 8), "contrast": (5, 6), "amsler": ([[3, 4], [3, 5], [4, 4]], []),
                 "symptoms": (2, 1, 2)},                                                   # RED
        },
        "daily": [(75, 92, {"sodium_mg": (3600, 4200), "exercise_min": (50, 70)})],
    },
    {
        "mission": "ares", "username": "mensah", "full_name": "Kofi Mensah", "call_sign": "Mensah", "crew_role": "PILOT",
        "baseline": {"near": ([9, 9, 9], [9, 9, 9]), "contrast": ([7, 7, 7], [7, 7, 7])},
        "normal": {"near": (9, 9), "contrast": (7, 7)},
    },
    {
        "mission": "ares", "username": "adjei", "full_name": "Efua Adjei", "call_sign": "Adjei", "crew_role": "SPECIALIST",
        "medical_officer": True,
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
        "checks": {42: {"symptoms": (2, 0, 1)}, 44: {"symptoms": (1, 0, 0)}},             # AMBER, retest GREEN
        # spec says 4.8–6.0; agreed fix 5.0–6.0 so day 45 is AMBER (not RED) as T9 expects
        "daily": [(40, 48, {"sleep_hours": (5.0, 6.0), "mood": (3, 3)})],
    },
    # ---- Ares Transit 1: extra crew ------------------------------------------------
    {
        "mission": "ares", "username": "asante", "full_name": "Kwame Asante", "call_sign": "Asante", "crew_role": "ENGINEER",
        "baseline": {"near": ([9, 9, 9], [9, 8, 9]), "contrast": ([7, 7, 7], [7, 7, 7])},
        "normal": {"near": (9, 9), "contrast": (7, 7)},
    },
    {
        "mission": "ares", "username": "owusu", "full_name": "Abena Owusu", "call_sign": "Owusu", "crew_role": "SPECIALIST",
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
        "checks": {91: {"contrast": (6, 5), "symptoms": (1, 0, 0)}},                       # latest: AMBER (watch)
    },
    {
        "mission": "ares", "username": "appiah", "full_name": "Kojo Appiah", "call_sign": "Appiah", "crew_role": "ENGINEER",
        "baseline": {"near": ([7, 7, 7], [7, 7, 7]), "contrast": ([5, 5, 5], [5, 5, 5])},
        "normal": {"near": (7, 7), "contrast": (5, 5)},
        "checks": {56: {"symptoms": (1, 0, 1)}},                                           # mild, still GREEN
    },
    # ---- Artemis Base 2 (Moon, finished) -------------------------------------------
    {
        "mission": "artemis", "username": "frimpong", "full_name": "Akosua Frimpong", "call_sign": "Frimpong",
        "crew_role": "COMMANDER",
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
    },
    {
        "mission": "artemis", "username": "agyeman", "full_name": "Nana Agyeman", "call_sign": "Agyeman", "crew_role": "PILOT",
        "baseline": {"near": ([9, 9, 9], [9, 9, 9]), "contrast": ([7, 7, 7], [7, 7, 7])},
        "normal": {"near": (9, 9), "contrast": (7, 7)},
        # Left eye one line lower from day 70: AMBER while the drop is a fresh trend, then GREEN on the
        # Moon because a 1-line drift is under the gravity-adjusted threshold (1.0 × 1.1).
        "checks": {day: {"near": (8, 9)} for day in range(70, 120, 7)},
    },
    {
        "mission": "artemis", "username": "quaye", "full_name": "Esi Quaye", "call_sign": "Quaye", "crew_role": "SPECIALIST",
        "medical_officer": True,
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
        "checks": {35: {"symptoms": (1, 1, 1)}, 37: {}},                                   # AMBER, retest GREEN
    },
    # ---- Gateway Station 9 (finished) ----------------------------------------------
    {
        "mission": "gateway", "username": "bonsu", "full_name": "Kweku Bonsu", "call_sign": "Bonsu", "crew_role": "COMMANDER",
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
        "checks": {
            147: {"near": (8, 7)},                                                         # AMBER (+ CO₂)
            154: {"near": (8, 6), "amsler": ([], [[5, 5], [5, 6]]), "symptoms": (1, 1, 1)},  # RED
            156: {"near": (8, 7), "amsler": ([], [[5, 5]])},                               # retest: AMBER
        },
    },
    {
        "mission": "gateway", "username": "sarpong", "full_name": "Adwoa Sarpong", "call_sign": "Sarpong",
        "crew_role": "ENGINEER",
        "baseline": {"near": ([8, 8, 8], [8, 8, 8]), "contrast": ([6, 6, 6], [6, 6, 6])},
        "normal": {"near": (8, 8), "contrast": (6, 6)},
    },
    {
        "mission": "gateway", "username": "tetteh", "full_name": "Afua Tetteh", "call_sign": "Tetteh", "crew_role": "SPECIALIST",
        "medical_officer": True,
        "baseline": {"near": ([9, 9, 9], [9, 9, 9]), "contrast": ([7, 7, 7], [7, 7, 7])},
        "normal": {"near": (9, 9), "contrast": (7, 7)},
    },
]

# Earth-side logins (spec 05 §3). The admin is a Django superuser with the ADMIN role.
SURGEON = {"username": "surgeon", "first_name": "Yaw", "last_name": "Boateng"}  # display "Dr. Yaw Boateng"
ADMIN_USERNAME = "admin"
DEFAULT_PASSWORD = "sightline-demo"
