# 05 — Seed Data Spec (the demo story)
**Command:** `python manage.py seed_mission [--reset] [--today-day 92] [--seed 42]`
**Location:** `core/management/commands/seed_mission.py`

> The seed data **is the demo**. It must produce the same story every time (fixed random seed).

---

## 1. The Story in One Paragraph

The crew of **Ares Transit 1** is on day **92** of a Mars transit. Everything is normal until around **day 78**, when a CO₂ scrubber underperforms and cabin CO₂ rises for about 10 days. **Commander Osei's left eye** starts drifting: amber on day 84, red on day 91 with a new wavy patch on the grid. **Pilot Mensah** stays green the whole time. **Specialist Adjei** (the Medical Officer) has a brief amber from poor sleep and mild symptoms, then recovers. During the live demo, Osei takes the day-92 test and SightLine confirms red, links it to CO₂ and escalates to Earth.

---

## 2. Dates

- `--today-day 92` → mission `start_date = today − 91 days`, so **today is mission day 92**.
- Everything is generated **relative to today**, so the demo works whatever date you run it.
- Mission: `name="Ares Transit 1"`, `environment=TRANSIT`, `gravity_g=0.00`, `planned_duration_days=900`, `is_active=True`.

---

## 3. People & Logins

| Username | Role | Linked astronaut | Notes |
|---|---|---|---|
| `osei` | CREW | Ama Osei: COMMANDER | the one who gets worse |
| `mensah` | CREW | Kofi Mensah: PILOT | stays healthy |
| `adjei` | MEDICAL_OFFICER | Efua Adjei: SPECIALIST, `is_medical_officer=True` | brief amber |
| `surgeon` | FLIGHT_SURGEON | none | display "Dr. Yaw Boateng" (Earth) |
| `admin` | ADMIN + superuser | none | for Django admin |

Password for all: read from env var `SEED_DEMO_PASSWORD` (default `sightline-demo`). **Demo only.** Print the logins at the end of the command.

---

## 4. Baselines (pre-flight)

3 baseline checks per astronaut on mission days **−30, −20, −10** (`is_baseline=True`), no symptoms, no Amsler marks.

| Astronaut | near L | near R | contrast L | contrast R |
|---|---|---|---|---|
| Osei | 8, 8, 8 | 8, 9, 8 | 6, 6, 6 | 6, 6, 6 |
| Mensah | 9, 9, 9 | 9, 9, 9 | 7, 7, 7 | 7, 7, 7 |
| Adjei | 8, 8, 8 | 8, 8, 8 | 6, 6, 6 | 6, 6, 6 |

→ Baseline averages computed automatically.

---

## 5. Cabin CO₂ (CabinLog: days 1 → 92)

| Days | co2_mmhg | Notes |
|---|---|---|
| 1–77 | 2.3–2.7 (random, uniform) | normal |
| 78–88 | 4.2–5.0 | scrubber issue |
| 89–92 | 3.0–3.4 | partly fixed, still a bit high |

Temperature 21.5–23.0 °C, humidity 40–50 %.

---

## 6. Daily Logs (DailyLog: days 1 → 92, every astronaut)

Normal ranges (random within):
- resting_hr 58–70 · BP 110–124 / 70–80 · sleep 6.8–8.2 h · mood 4–5 · sodium 2600–3200 mg · exercise 90–130 min

Story changes:
| Who | Days | Change |
|---|---|---|
| Osei | 75–92 | sodium 3600–4200 (higher), exercise 50–70 (busy with scrubber repairs) |
| Adjei | 40–48 | sleep 4.8–6.0, mood 3 |
| Mensah | — | always normal |

~5 % of days randomly skipped (realistic gaps). **Never skip day 91 or 92.**

---

## 7. Weekly Vision Checks (scored: days 7, 14, … 91)

Generated through the **same `submit_check` service the API uses**, so Assessments are real outputs of the engine.

| Astronaut | Days | near L / R | contrast L / R | amsler L / R | headache, pressure, blur | Expected |
|---|---|---|---|---|---|---|
| Osei | 7–70 | 8 / 8 | 6 / 6 | [] / [] | 0,0,0 | GREEN |
| Osei | 77 | 8 / 8 | 6 / 6 | [] / [] | 1,0,0 | GREEN |
| Osei | 84 | **7** / 8 | 6 / 6 | [] / [] | 1,1,1 | **AMBER** (+ CO₂ insight) |
| Osei | 86 (retest, 48 h) | 7 / 8 | **5** / 6 | [] / [] | 1,1,1 | AMBER |
| Osei | 91 | **6** / 8 | 5 / 6 | **[[3,4],[3,5],[4,4]]** / [] | 2,1,2 | **RED** (new amsler, drift 2, CO₂) |
| Mensah | 7–91 | 9 / 9 | 7 / 7 | [] / [] | 0,0,0 | GREEN |
| Adjei | 7–35, 56–91 | 8 / 8 | 6 / 6 | [] / [] | 0,0,0 | GREEN |
| Adjei | 42 | 8 / 8 | 6 / 6 | [] / [] | 2,0,1 | AMBER (symptoms 3) |
| Adjei | 44 (retest) | 8 / 8 | 6 / 6 | [] / [] | 1,0,0 | GREEN |
| Adjei | 49 | 8 / 8 | 6 / 6 | [] / [] | 0,0,0 | GREEN |

`taken_at` = that day 08:00–10:00 UTC (random minute).

**Day 92 is left empty for Osei:** that's the **live demo test**. Recommended live input: near L/R 6 / 8, contrast 5 / 6, amsler L `[[3,4],[3,5],[4,4],[4,5]]`, symptoms 2,1,2 → RED with CO₂ insight.

---

## 8. Command Behaviour

- `--reset`: delete all data from these apps (keep migrations), then seed.
- Without `--reset`: if an active mission exists, stop with a message.
- Wrap everything in `transaction.atomic()`.
- At the end print a summary:
  ```
  Mission "Ares Transit 1" · today = day 92
  Users: osei, mensah, adjei (MO), surgeon, admin · password: <SEED_DEMO_PASSWORD>
  Checks: 42 scored, 9 baseline · Osei latest: RED (day 91)
  ```

## 9. Acceptance Checks (after seeding)

- [ ] `GET /crew/overview/` → Osei RED, Mensah GREEN, Adjei GREEN
- [ ] Osei's day-91 assessment has `new_amsler_left = true` and a CO₂ env insight
- [ ] `GET /astronauts/1/trends/` shows the CO₂ bump at days 78–88 lining up with the vision drop
- [ ] `GET /astronauts/1/engagement/` → streak ≥ 12, badges FIRST_TEST, STREAK_4, STREAK_12
- [ ] Running the command twice with `--reset` gives identical results
