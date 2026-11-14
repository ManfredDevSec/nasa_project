# Hand-off: T3 → T6 (models, scoring engine, submit_check)

**From:** backend (T1 + T2 done) · **To:** you, picking up **T3, T4, T5, T6** from `06_BACKEND_TASKS.md`
**Branch:** `development` · **Date:** 14 Nov 2026

> If you use an AI tool, give it `.claude/CLAUDE.md`, `01_SETUP_AND_CONVENTIONS.md` and **this file** first,
> then the spec files each task names.

---

## 1. TL;DR

- The old prototype backend was **thrown away** and rebuilt to match the spec in `docs/`. Don't copy anything
  from older git history; it used different scales (logMAR, 20×20 Amsler grid) and some **opposite** scoring rules.
- **T1 (skeleton)** and **T2 (auth)** are done and tested (54 tests passing).
- **Part of T3 is already done:** `Mission` and `Astronaut` exist, because the `User` model links to an astronaut.
- Your job: the remaining models (T3, T4), the **scoring engine** (T5, the heart of the app), and the
  **`submit_check` service** that glues them together (T6). No API endpoints yet; those are T7.

---

## 2. Get it running (5 min)

**Option A: Docker** (from the repo root):
```bash
make fresh        # build + start backend, Redis (and frontend); waits until healthy
make superuser    # create your own admin login
```
**Option B: plain Python** (Fedora/Linux/macOS):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

| URL | What |
|---|---|
| http://localhost:8000/api/docs/ | Swagger (the API contract, live) |
| http://localhost:8000/admin/ | Django admin, the easiest way to create test data until the seed exists (T8) |
| http://localhost:8000/api/health/ | `{"status":"ok","database":"ok","cache":"ok"}` |

Run tests: `make test` (Docker) or `python manage.py test` (venv). `make test app=scoring` for one app.

**Local DB = SQLite, production = Neon Postgres** (set only on Render, in T12). So write models that work on
both: no Postgres-only fields or features. `JSONField` is fine on both.

> `make seed` **fails until T8**: the seed command was removed with the old code. Create data in the admin or `python manage.py shell`.

---

## 3. What exists now (and why it matters to you)

### Project layout
```
backend/
├── sightline/      settings.py, urls.py, exceptions.py (error format), tests.py
├── accounts/       User (role + astronaut link), login/logout/me, password reset, user admin, permissions.py
├── missions/       Mission ✅           ← you add CabinLog (T3)
├── crew/           Astronaut ✅         ← you add Baseline (T3)
├── vitals/         (empty)             ← you add DailyLog (T3)
├── checks/         (empty)             ← you add VisionCheck (T4) + services.py submit_check (T6)
├── scoring/        (empty)             ← you add Assessment (T4), config.py, engine.py, vitals_rules.py, tests.py (T5)
├── reports/        (empty, no models)  ← later (T9–T11)
└── core/           schema.py (Swagger helpers), views.py (health)   ← you add the mission_day helper (T3)
```

### Already-built models you'll use
- **`missions.Mission`**: `name, environment (STATION/TRANSIT/MOON_BASE/MARS_BASE), gravity_g (Decimal 0–1),
  start_date, planned_duration_days, is_active, created_at`.
  - `save()` enforces **only one active mission** (activating one deactivates the others; there's also a DB constraint).
  - `mission.mission_day(date)` → `(date − start_date).days + 1` (day 1 = start_date; pre-flight ≤ 0).
- **`crew.Astronaut`**: `mission (FK, related_name="astronauts"), full_name, call_sign, crew_role
  (COMMANDER/PILOT/SPECIALIST/ENGINEER), is_medical_officer, avatar_url, test_interval_days (default 7), created_at`.
  - `astronaut.display_name` → "Cmdr. Ama Osei".
- **`accounts.User`**: `role` (CREW / MEDICAL_OFFICER / FLIGHT_SURGEON / ADMIN) + `astronaut` (OneToOne, `related_name="user"`).

### Errors: use these, don't invent new formats
Every error must look like `{"error": {"code", "message", "details"}}` (01 §5). The handler in
`sightline/exceptions.py` does this automatically for DRF errors. For your own errors:
```python
from sightline.exceptions import ConflictError, BadRequestError

class NoBaselineError(ConflictError):          # suggested: scoring/exceptions.py
    error_code = "NO_BASELINE"
    default_detail = "This astronaut has no baseline yet. Do the pre-flight baseline tests first."
```
Raising `NoBaselineError()` anywhere in a request then becomes **409 `NO_BASELINE`** with no extra code.
That's exactly what T5 case 14 and T6 need. (It has no DB or DRF side effects, so the engine stays "pure".)

### Things that matter later (FYI, not your tasks)
- `accounts/permissions.py`: `can_view_astronaut`, `can_edit_astronaut`, `visible_astronauts(user)`,
  `AstronautAccess` (object permission: works on anything with an `.astronaut`, so it'll work on your
  VisionCheck/DailyLog), `role_required(...)`. T7 uses these. **Keep the field name `astronaut`** on your models.
- `core/schema.py`: `error_response(...)`, `NOT_AUTHENTICATED`, `ErrorSerializer` for `@extend_schema` docs (T7).
- New API URLs are added in `sightline/urls.py` inside `api_v1_patterns`, **above** the catch-all line.
- Auth endpoints and user management are documented in `03_API_SPECIFICATION.md` §1–3.

### Writing tests that create users
Copy the pattern from `accounts/tests.py` → `AuthTestBase`: it uses `override_settings` with a **fast password
hasher** (otherwise each user costs ~0.5 s) and an **in-memory cache** (so tests never touch Redis).
`make_world()` there builds a mission + 4 astronauts + 5 users if you need them.

---

## 4. Your tasks

### T3: Baseline, CabinLog, DailyLog (+ mission_day helper)
**Specs:** 02 §3.4, §3.7, §3.8, §4 (last row)

Already done: Mission, Astronaut (+ their admin). **Left:**
- `core`: a shared `mission_day(start_date, date)` helper; make `Mission.mission_day()` call it (keep the method:
  tests use it).
- `crew.Baseline`: OneToOne → Astronaut; `near_vision_left/right`, `contrast_left/right` = **Decimal(4,2)**
  (averages, e.g. 8.33); `checks_used`; `updated_at`. Filled by T6, not by hand.
- `missions.CabinLog`: mission, date, mission_day, `co2_mmhg` Decimal(4,2) 0–15, temperature, humidity.
  **Unique (mission, date)**.
- `vitals.DailyLog`: astronaut, date, mission_day, all value fields **nullable** with the ranges in 02 §3.7.
  **Unique (astronaut, date)**. `created_at`/`updated_at`.
- `mission_day` computed in `save()` from the mission's `start_date` (DailyLog: via `astronaut.mission`).
- Admin registration with useful `list_display` / `list_filter` (02 §5).

**Done when** (adapted): migrations apply (SQLite now, Neon in T12), you can add these in the admin,
`mission_day` is filled on save.

### T4: VisionCheck + Assessment
**Specs:** 02 §2 (scales!), §3.5, §3.6
- `checks.VisionCheck` (02 §3.5). `mission_day` from `taken_at` on save. Index `(astronaut, taken_at)`.
- `scoring.Assessment` (02 §3.6). OneToOne → VisionCheck, plus denormalised `astronaut` FK. Index `(astronaut, created_at)`.
- Validation in **model `clean()` and serializer**. Tip: write the rules once as validators (e.g.
  `core/validators.py: validate_amsler_cells`) and use them in both places.
  - near 1–10, contrast 1–8, symptoms 0–3
  - Amsler: list of `[row, col]` pairs, each 0–9, **no duplicates**, default `[]`
- Remember: **higher = better** for vision and contrast. Drift = baseline − current (positive = worse).

**Done when:** near_vision 11 and amsler `[10, 2]` are rejected.

### T5: Scoring engine (the most important task, ≈2 h)
**Specs:** 04 (all of it); `08_NASA_RESOURCES.md` for any wording that mentions NASA
- `scoring/config.py`: copy 04 §1 exactly. **Every threshold lives here**, never as a number in logic.
  Comment each value as `# demo value` or with its source (08 says only `gravity_g` Mars 0.38 has a NASA source).
- `scoring/engine.py`: **pure functions**. Plain data in (dataclasses), a result dataclass out. No ORM queries,
  no saving. This makes the 14 test cases trivial to write.
- `scoring/vitals_rules.py`: 04 §4 (HR, BP, sleep, mood → GREEN/AMBER/RED/UNKNOWN + guidance text).
- `scoring/tests.py`: **all 14 eye cases + the vitals cases** from 04 §5. `python manage.py test scoring` → 100 %.

Watch out for:
- **Amsler:** *new* marks (previous check had none) → **RED**; marks that were *already there* → **AMBER**.
  The deleted old engine had this backwards.
- **Gravity multiplier:** pick the first `GRAVITY_STRICTNESS` bound ≥ `gravity_g` (0.00 → 1.0, Mars 0.38 → 1.2).
  Case 13 depends on it.
- **Trend (step 5):** uses `previous_checks + [current]`, oldest → newest, needs ≥ `TREND_CHECKS` points,
  "never improves and drops ≥ 1 in total".
- **Decimals:** Baseline values come from the DB as `Decimal`. Convert at the boundary (float or Decimal, pick
  one) and round drifts to 2 places so 8.33 − 8 = 0.33 exactly.
- **Env insights only for AMBER/RED** (case 11). Missing data → skip silently.
- **CO₂ / salt / exercise wording (agreed decision):** NASA's pages do **not** link these to SANS (08 "Known gap").
  The insight text must say it's a pattern, not a cause. E.g. *"This change followed 4 days of high cabin CO₂.
  This is a pattern we noticed, not a proven cause."* Keep the `factor` codes (`CO2`, `SODIUM`, `EXERCISE`)
  and action codes from 04.
- **Lookback windows:** use the N days **before** the check date (not including the check day). The spec is
  ambiguous on this; this is the version we're going with.
- `NoBaselineError` (see §3 above) for case 14.

### T6: `submit_check` + Baseline recompute
**Specs:** 02 §4
- `checks/services.py: submit_check(validated_data) -> (check, assessment | None, baseline | None)`
  inside `transaction.atomic()`.
- **Baseline check** (`is_baseline=True`): save it, recompute that astronaut's Baseline = average of **all**
  their baseline checks, set `checks_used`. Return `(check, None, baseline)`.
- **Scored check:** no baseline → raise `NoBaselineError` (→ 409). Otherwise load the context the engine needs
  (04 §2):
  - baseline
  - last `TREND_CHECKS` scored checks before this one, plus the previous one
  - cabin logs and daily logs in the lookback windows
  - `astronaut.mission.gravity_g`

  Then call the engine and save the Assessment with reasons, actions, insights, `escalate_to_earth` and
  `next_test_due`.
- Order checks by `taken_at`. The seed (T8) inserts history out of real time, so never rely on `created_at` or `id` order.
- Write tests in `checks/tests.py` (baseline average, 409 without baseline, an AMBER/RED case with a CO₂ insight).
  The T7 API and the T8 seed **both** call this function, so it's worth getting right.

**Done when:** in a test or the shell, baseline checks → Baseline exists with the right averages; a scored
check → Assessment saved with reasons and actions.

---

## 5. Decisions already made (so you don't have to ask)

| Topic | Decision | Affects |
|---|---|---|
| DB | SQLite locally, Neon only on Render | everything |
| Spec 03 = contract | Don't change response shapes without telling the team; update 03 if you do | T7+ |
| CO₂/salt insight wording | "pattern, not a proven cause" (see T5) | **T5** |
| Lookback window | N days before the check date, check day excluded | **T5, T6** |
| Seed sleep ranges | Mensah normal sleep 7.0–8.2 h; Adjei days 40–48 sleep 5.0–6.0 h (so the 05 §9 checks hold) | T8 |
| Seed summary | Print the real check count (05 §7 adds up to 41, not 42) | T8 |
| `CO2_HIGH_START` event | First day CO₂ > `CO2_HIGH_MMHG` after a normal day | T10 |
| Crew list `headline` | First reason of the latest assessment | T7, T11 |
| Old frontend in `frontend/` | Being replaced; ignore it | all |

---

## 6. How we work (from `.claude/CLAUDE.md` + 06)

1. **One task at a time.** After each one, run it, tick its "Done when" list, then **commit** (one commit per task).
2. **All thresholds in `scoring/config.py`.**
3. **Never invent NASA facts or numbers.** Only use `08_NASA_RESOURCES.md`; otherwise label it a demo value.
4. **Never commit `.env`.** Add new settings to `backend/.env.example`.
5. Spec unclear or two specs disagree? **Ask before guessing**, then add the answer to the table above.

## 7. Gotchas

- **Login rate limit** is 10/min per IP. If manual testing trips it (429), put `AUTH_THROTTLE_RATE=1000/min`
  in your `backend/.env` and restart.
- **Swagger "Authorize":** paste only the token (no `Token ` prefix).
- **After pulling new migrations in Docker:** `make migrate`. If migration history gets tangled while you
  iterate on T3/T4 models: `make reset-db` (wipes the local DB, which is fine since there's no seed data yet).
- **Password reset / invite emails** print in the backend logs (`make logs-backend`), not to a real inbox.
- The `frontend` container may start with `make up`. Ignore it.
