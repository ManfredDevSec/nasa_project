# 06 — Backend Task List (build in this order)

**How to use with AI:** for each task, paste:
1. `01_SETUP_AND_CONVENTIONS.md` (once per session)
2. the spec file(s) named in the task
3. the task text below

Then check every "Done when" box before moving on. Commit after each task.

---

### T1: Project skeleton (≈45 min)
**Specs:** 01
- Create `backend/` Django project `sightline`, apps: `accounts, missions, crew, checks, vitals, scoring, reports, core`
- Install requirements, settings per 01 §4 (env vars, DRF, CORS, whitenoise, spectacular)
- Custom error handler `sightline/exceptions.py`
- URLs: `/admin/`, `/api/v1/`, `/api/schema/`, `/api/docs/`

**Done when:** `runserver` works; `/api/docs/` loads; an unknown URL under `/api/v1/` returns the standard error JSON.

### T2: Custom User + auth endpoints (≈45 min)
**Specs:** 02 §3.1, 03 §1, A1–A3
- `accounts.User(AbstractUser)` with `role` + nullable OneToOne `astronaut` (string reference `"crew.Astronaut"`)
- `rest_framework.authtoken`; login/logout/me views
- Permission helpers `can_view_astronaut`, `can_edit_astronaut`, role permission classes

**Done when:** first `migrate` succeeds; create a superuser; login returns a token; `/auth/me/` works with the token, returns 401 without.

### T3: Mission, Astronaut, Baseline, CabinLog, DailyLog models (≈45 min)
**Specs:** 02 §3.2–3.4, 3.7, 3.8
- Models, enums, `mission_day` helper in `core`, admin registration

**Done when:** migrations apply on Neon; can add a mission and astronaut in admin; mission_day is computed on save.

### T4: VisionCheck + Assessment models (≈30 min)
**Specs:** 02 §3.5–3.6, §4
- Validation for ranges and Amsler cells (in model `clean()` **and** serializer)

**Done when:** invalid values (e.g. near_vision 11, amsler `[10,2]`) are rejected.

### T5: Scoring engine (core logic) (≈2 h)
**Specs:** 04 (all)
- `scoring/config.py`, `scoring/engine.py` as **pure functions** (take plain data in, return a result dataclass)
- `scoring/vitals_rules.py`
- `scoring/tests.py` with all 14 eye cases + vitals cases

**Done when:** `python manage.py test scoring` passes 100 %.

### T6: submit_check service + Baseline recompute (≈45 min)
**Specs:** 02 §4
- `checks/services.py: submit_check(validated_data) -> (check, assessment|None, baseline|None)` inside `transaction.atomic()`
- baseline check → recompute Baseline; scored check → load context, call engine, save Assessment
- Raise `NoBaselineError` → 409

**Done when:** Django shell: create baseline checks → baseline exists; submit a scored check → Assessment saved with reasons/actions.

### T7: Core CRUD endpoints (≈1.5 h)
**Specs:** 03: M1, C1–C3, V1–V3, D1–D2, E1–E2
- Serializers, viewsets, filters (`astronaut`, `from`, `to`, `include_baseline`), upsert for daily/cabin logs, permissions
- `@extend_schema` with examples

**Done when:** every request/response in 03 matches in Swagger; CREW gets 403 on another astronaut.

### T8: Seed command (≈1.5 h)
**Specs:** 05 (all)
- Uses `submit_check` for scored checks (no shortcuts)

**Done when:** all acceptance checks in 05 §9 pass.

### T9: Body map + vitals status (≈1 h)
**Specs:** 03 R1, D1 `vitals_status`; 04 §4
- `reports/content.py` (static info text per part)

**Done when:** Osei → EYES RED, HEART GREEN; Adjei's day-45 log gives SLEEP AMBER if queried at that point.

### T10: Trends + engagement (≈1 h)
**Specs:** 03 R2, R3; 04 §6

**Done when:** trends arrays line up by mission_day; events include `CO2_HIGH_START` at day 78; engagement badges match 05 §9.

### T11: Crew overview + weekly report (≈1 h)
**Specs:** 03 R4, R5

**Done when:** overview shows Osei RED with an alert; weekly report for today lists CO₂ avg/max and the Osei insight.

### T12: Deploy to Render + Neon (≈45 min)
**Specs:** 01 §7

**Done when:** live `/api/docs/` works; seed run on Render; frontend teammate can log in from their local React app (CORS OK).

### T13 (if time): Polish
- Rate-limit login (DRF throttling) · request logging · README with endpoint list and sources
- Postman/Thunder Client collection exported to repo

---

## Priority if time runs out
Must: T1–T8, T12 → that alone gives a working demo (scored tests + crew list + history).
Then: T9 (body map) → T11 → T10.

## Hand-off to frontend (send as soon as T7 is deployed)
- API base URL
- `/api/docs/` link
- Demo logins
- `03_API_SPECIFICATION.md`
