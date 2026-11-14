# 02 — Database Schema
**Project:** SightLine · **DB:** PostgreSQL (Neon) · **ORM:** Django

---

## 1. Overview (ER diagram)

```
                 ┌────────────┐
                 │  Mission   │
                 └─────┬──────┘
          1 ┌──────────┼───────────────┐ 1
            ▼ *        │               ▼ *
     ┌────────────┐    │         ┌────────────┐
     │ Astronaut  │    │         │  CabinLog  │  (CO₂ per day)
     └─────┬──────┘    │         └────────────┘
   1       │ 1         │
 ┌─────────┼─────────────────────────┬──────────────┐
 ▼ 0..1    ▼ 0..1                    ▼ *            ▼ *
┌──────┐ ┌──────────┐          ┌─────────────┐ ┌──────────┐
│ User │ │ Baseline │          │ VisionCheck │ │ DailyLog │
└──────┘ └──────────┘          └──────┬──────┘ └──────────┘
                                      │ 1
                                      ▼ 0..1
                               ┌─────────────┐
                               │ Assessment  │
                               └─────────────┘
```

- A **Mission** has many **Astronauts** and many **CabinLogs**.
- An **Astronaut** has one **Baseline**, many **VisionChecks**, many **DailyLogs**, and may be linked to one **User** (login).
- Each non-baseline **VisionCheck** gets exactly one **Assessment** (the scoring result).
- Flight surgeons are **Users with no Astronaut**.

**Computed, not stored:** streaks, badges, next test due, body map, trends, weekly report.

---

## 2. Scales Used (important: read first)

| Measure | Range | Meaning | Better is |
|---|---|---|---|
| `near_vision_*` | **1–10** (int) | Smallest chart line read correctly. 1 = biggest letters, 10 = smallest | **Higher** |
| `contrast_*` | **1–8** (int) | Faintest contrast level read. 1 = darkest letters, 8 = faintest | **Higher** |
| `amsler_*` | list of `[row, col]` | Cells tapped as wavy/missing on a **10×10 grid** (0-indexed) | **Empty** |
| `headache`, `eye_pressure`, `blur` | **0–3** (int) | 0 none, 1 mild, 2 moderate, 3 severe | **Lower** |
| `mood` | **1–5** (int) | 1 very low → 5 very good | Higher |
| `co2_mmhg` | float | Cabin CO₂ partial pressure (mmHg) | Lower |

**Drift** = `baseline − current` (for vision/contrast). Positive drift = got worse.

---

## 3. Tables

### 3.1 `accounts_user` — **User** (custom, extends `AbstractUser`)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| username | varchar(150) | unique (Django default) |
| password | hashed | Django default |
| first_name, last_name | varchar | |
| role | varchar(20) | enum: `CREW`, `MEDICAL_OFFICER`, `FLIGHT_SURGEON`, `ADMIN` |
| astronaut | FK → Astronaut, **OneToOne**, nullable | required if role is `CREW` or `MEDICAL_OFFICER`; null for `FLIGHT_SURGEON` |

> Must be created **before the first migration** (`AUTH_USER_MODEL = "accounts.User"`).

### 3.2 `missions_mission` — **Mission**
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| name | varchar(100) | e.g. "Ares Transit 1" |
| environment | varchar(20) | enum: `STATION`, `TRANSIT`, `MOON_BASE`, `MARS_BASE` |
| gravity_g | decimal(4,2) | 0.00 (transit/station), 0.17 (Moon), 0.38 (Mars) |
| start_date | date | Mission day 1 |
| planned_duration_days | int | e.g. 900 |
| is_active | bool | only **one** active mission (enforce in `save()`) |
| created_at | datetime | auto |

**Helper:** `mission_day(date) = (date − start_date).days + 1`. Pre-flight dates give ≤ 0.

### 3.3 `crew_astronaut` — **Astronaut**
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| mission | FK → Mission | on_delete CASCADE |
| full_name | varchar(100) | |
| call_sign | varchar(30) | short display name, e.g. "Osei" |
| crew_role | varchar(20) | enum: `COMMANDER`, `PILOT`, `SPECIALIST`, `ENGINEER` |
| is_medical_officer | bool | default False; one per mission |
| avatar_url | varchar(255) | optional |
| test_interval_days | int | default **7** (weekly test) |
| created_at | datetime | auto |

### 3.4 `crew_baseline` — **Baseline** (one per astronaut, per eye)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| astronaut | OneToOne → Astronaut | |
| near_vision_left | decimal(4,2) | average of baseline checks |
| near_vision_right | decimal(4,2) | |
| contrast_left | decimal(4,2) | |
| contrast_right | decimal(4,2) | |
| checks_used | int | how many baseline checks went into the average (target 3–5) |
| updated_at | datetime | auto |

Recomputed automatically whenever a VisionCheck with `is_baseline=True` is saved.

### 3.5 `checks_visioncheck` — **VisionCheck** (one test session, both eyes)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| astronaut | FK → Astronaut | CASCADE |
| taken_at | datetime | default now |
| mission_day | int | computed from `taken_at` on save |
| is_baseline | bool | True = pre-flight baseline test (not scored) |
| near_vision_left | smallint | 1–10 |
| near_vision_right | smallint | 1–10 |
| contrast_left | smallint | 1–8 |
| contrast_right | smallint | 1–8 |
| amsler_left | JSON | list of `[row, col]`, each 0–9, no duplicates, default `[]` |
| amsler_right | JSON | same |
| headache | smallint | 0–3 |
| eye_pressure | smallint | 0–3 |
| blur | smallint | 0–3 |
| distance_ok | bool, nullable | from optional camera check; null = not checked |
| notes | text | optional |
| created_at | datetime | auto |

Index: `(astronaut, taken_at)`.

### 3.6 `scoring_assessment` — **Assessment** (scoring result for one check)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| vision_check | OneToOne → VisionCheck | CASCADE |
| astronaut | FK → Astronaut | (denormalised for fast queries) |
| level | varchar(5) | `GREEN`, `AMBER`, `RED` |
| near_drift_left | decimal(4,2) | baseline − current |
| near_drift_right | decimal(4,2) | |
| contrast_drift_left | decimal(4,2) | |
| contrast_drift_right | decimal(4,2) | |
| worse_eye | varchar(5), nullable | `LEFT`, `RIGHT`, `BOTH`, or null |
| symptom_score | smallint | headache + eye_pressure + blur (0–9) |
| new_amsler_left | bool | distortion present now, not in previous check |
| new_amsler_right | bool | |
| reasons | JSON | list of strings (plain language) |
| actions | JSON | list of `{code, text, priority}` |
| env_insights | JSON | list of `{factor, text, value, normal}` |
| escalate_to_earth | bool | True when RED |
| next_test_due | date | when to test next (48 h for AMBER/RED, interval for GREEN) |
| created_at | datetime | auto |

Index: `(astronaut, created_at)`.

### 3.7 `vitals_dailylog` — **DailyLog** (vitals + lifestyle, once per day per astronaut)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| astronaut | FK → Astronaut | CASCADE |
| date | date | |
| mission_day | int | computed |
| resting_hr_bpm | smallint, nullable | 30–200 |
| systolic_mmhg | smallint, nullable | 70–220 |
| diastolic_mmhg | smallint, nullable | 40–140 |
| sleep_hours | decimal(3,1), nullable | 0–24 |
| mood | smallint, nullable | 1–5 |
| sodium_mg | int, nullable | 0–10000 |
| exercise_min | smallint, nullable | 0–600 (resistive + aerobic) |
| created_at / updated_at | datetime | auto |

Unique: `(astronaut, date)` (POST acts as **upsert**).

### 3.8 `missions_cabinlog` — **CabinLog** (environment, once per day per mission)
| Field | Type | Rules |
|---|---|---|
| id | PK | |
| mission | FK → Mission | CASCADE |
| date | date | |
| mission_day | int | computed |
| co2_mmhg | decimal(4,2) | 0–15 |
| temperature_c | decimal(4,1), nullable | |
| humidity_pct | decimal(4,1), nullable | |

Unique: `(mission, date)` (upsert).

---

## 4. Signals / Save Behaviour

| When | Then |
|---|---|
| VisionCheck saved with `is_baseline=True` | Recompute that astronaut's **Baseline** (average of all baseline checks) |
| VisionCheck saved with `is_baseline=False` | Run `scoring.engine.assess(check)` → create/replace its **Assessment** |
| Any model with `mission_day` | Compute it on `save()` from the mission's `start_date` |

> Prefer calling these from a **service function** (`checks/services.py: submit_check(data)`) inside `transaction.atomic()` rather than Django signals, because it's easier to debug and to test.

**Rule:** a non-baseline check **cannot be scored without a baseline**. Return `409 CONFLICT` with code `NO_BASELINE`.

---

## 5. Django Admin

Register all models. Useful list views:
- VisionCheck: astronaut, mission_day, near L/R, contrast L/R, is_baseline
- Assessment: astronaut, mission_day (via check), level, escalate_to_earth
- DailyLog / CabinLog: date, key values
- Filters: astronaut, level, is_baseline
