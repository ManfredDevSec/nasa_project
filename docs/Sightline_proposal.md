# SightLine — Project Proposal
**NASA Space Apps Challenge 2026 · "Create Health Monitoring Software for Astronauts on Space Missions"**
Team: _[team name]_ · Local event: _[KNUST / Kumasi]_ · Stack: React frontend + Python Django REST backend

> **Working name:** SightLine (change freely).
> **One line:** An onboard tool that catches astronaut vision damage early, using a 2-minute tablet test, and links it to cabin conditions that may be causing it.

---

## 1. The Problem (in plain words)

In space there is no gravity pulling body fluids down, so fluid moves up toward the head. Over months, this can press on the back of the eyes and change their shape. NASA calls this **SANS — Spaceflight-Associated Neuro-ocular Syndrome**.

What it does to astronauts:
- Near vision gets blurry (reading a checklist or a screen gets harder)
- Swelling at the back of the eye, folds in the eye tissue
- Some changes **do not fully go away** after returning to Earth

Why it is a big deal for Mars and deep space:
- Missions will last much longer than ISS stays, so the damage has more time to build up
- Proper eye scans need special equipment and specialists that won't be on board
- Messages to Earth take **3 to 22 minutes each way**, so the crew can't get a quick live check-up

**The gap:** Crews need a simple way to notice vision getting worse *slowly*, week by week, before it becomes serious. Right now, most health-monitoring ideas focus on heart rate and oxygen, and miss this.

---

## 2. What SightLine Solves

| Problem | What SightLine does |
|---|---|
| Vision loss is slow and easy to miss | Weekly 2-minute vision tests, compared to **each astronaut's own normal** |
| No eye specialist on board | Simple green / amber / red status with plain-language next steps |
| Causes are unclear (CO₂, salt, exercise are suspects) | Lines up vision changes with cabin and lifestyle data and points out patterns |
| Slow, limited link to Earth | Small weekly report built to send over a delayed connection |

**What SightLine is NOT:** a medical device or a diagnosis. It is an **early-warning and decision-support** tool. It tells the crew "something is changing, look closer", not "you have X".

---

## 3. Target Users

| User | Who they are | What they need from SightLine |
|---|---|---|
| **Astronaut (crew member)** | Takes the weekly test | Quick test, clear result, simple advice |
| **Crew Medical Officer** | Crew member trained in basic medicine | View of the whole crew, alerts, trends |
| **Flight Surgeon (on Earth)** | Doctor at Mission Control | Weekly report with trends and cause notes |
| **Researchers (secondary)** | Scientists studying SANS | Clean, timestamped data linking vision to environment |

**Earth spin-off (good for the pitch):** the same idea works for people at risk of vision problems in remote areas: diabetics, glaucoma patients, rural clinics with no eye doctor. Relevant to Ghana and similar settings.

---

## 4. How We Answer the Challenge

**Official challenge (summary):** Build a **visual tool** that helps astronauts **assess their own health** during space missions and gives **guidance on treatments and health improvements**. Any input works (keyboard, clicks, camera) as long as it represents a health indicator.

### 4.1 Objectives → our answer

| Official objective / question | How SightLine meets it |
|---|---|
| "Gathers health indicators" from any input (text, clicks, camera) | Tap-based vision tests, Amsler grid clicks, symptom sliders, camera distance check |
| Helps astronauts **assess their own health** | Self-run 2-min test → instant green/amber/red result; no doctor needed |
| Gives **guidance on treatments and improvements** | Each result comes with actions: retest, inform Medical Officer, check CO₂ scrubbers, salt and exercise advice |
| *Which measurements can be performed in space?* | Only a tablet is needed: no specialist eye equipment |
| *Why is an exam needed?* | SANS is slow and silent; regular checks catch drift early |
| *How do spaceflight hazards affect indicators?* | Links **altered gravity** (fluid shift) and **hostile closed environment** (CO₂) to vision scores |
| *When does a result need crew or flight surgeon attention?* | Amber → crew Medical Officer · Red → priority report to Earth flight surgeons |
| *What actions prevent a critical condition?* | Early retesting, environment fixes, lifestyle nudges, escalation to Earth |
| UI should **present metrics clearly**; animations and interactivity | Animated test steps, dynamic trend charts with CO₂ overlay |
| Example: **clickable human figure** | **Body map** home screen: tap a body part to see its status and an explanation (eyes = full SightLine module) |
| Use **NASA Human Research Program** resources | Risk factors and thresholds based on HRP's SANS evidence and the 5 hazards |

### 4.2 Potential considerations → our answer

| Consideration (optional) | SightLine |
|---|---|
| Different environments (spacecraft, station, rover, Moon/Mars base) | Mission settings: environment type + gravity level (0g / Moon / Mars); changes how strict the rules are |
| Prompt astronauts to take measurements as routine | Weekly test reminders on the mission calendar; retest prompts after Amber |
| **Gamification** | Test streaks, "crew consistency" badge, mission-week progress ring |
| **Dynamic charts** over time | Vision trend vs baseline, CO₂ / salt / exercise overlays |
| **Colour coding** at a glance | Green / amber / red everywhere: body map, cards, charts |
| Don't assume astronauts know how to assess health | "Why this test?" info card before each step; plain-language result explanations; "Learn" page on SANS and the 5 hazards |

### 4.3 Our angle (why focus on the eyes)

The challenge is about **general self-assessment**, and most teams will build broad vitals dashboards (heart rate, BP, sleep, mood). We take a **body map + deep module** approach:

- The **body map** shows the whole astronaut, so we still answer the "assess your own health" goal.
- The **eyes** are the fully built feature: SANS is a real NASA-recognised risk that vitals dashboards can't see.
- Other body parts show simple indicators entered by hand (heart rate, BP, sleep, mood: the ones the challenge names) with basic colour rules. This is a **light layer**; build only if time allows. The pitch says "more modules plug in the same way."

This keeps us **specific (memorable to judges)** without being **too narrow (off-brief)**.

---

## 5. Objectives (what "done" means)

### Must have (MVP: needed for the demo)
1. **O1:** Astronaut can take a weekly vision test on a tablet screen (near vision + Amsler grid + contrast + symptoms)
2. **O2:** System stores a personal baseline for each astronaut
3. **O3:** Scoring engine gives green/amber/red with a written reason
4. **O4:** Fake 180-day mission data for 3 astronauts, one getting worse
5. **O5:** Crew dashboard showing each astronaut's status and trend chart
6. **O6:** Environment links: shows when a drop followed high CO₂ / high salt

7. **O7:** **Clickable body map** home screen (eyes fully working; other parts show status/info)
8. **O8:** "Why this test?" explanations + plain-language guidance on every result

### Should have
9. **O9:** Earth report page (printable / exportable)
10. **O10:** Gamification: test streaks + badges
11. **O11:** Reminders / retest prompts
12. **O12:** Basic vitals entry (HR, BP, sleep, mood) feeding the body map
13. **O13:** Learn page: SANS + NASA's 5 hazards

### Nice to have
14. **O14:** Camera check for distance from screen
15. **O15:** Mission environment setting (station / Moon / Mars)
16. **O16:** Deploy online (AWS) so judges can try it

---

## 6. Data Flow

```
                ┌──────────────────────────┐
                │   BEFORE LAUNCH          │
                │   3–5 baseline tests     │
                └────────────┬─────────────┘
                             ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│ Astronaut     │──▶│ Weekly Vision    │──▶│ Django Backend       │
│ (tablet)      │   │ Test (2 min)     │   │ saves VisionCheck    │
└───────────────┘   └──────────────────┘   └──────────┬───────────┘
                                                      │
┌───────────────┐                                     │
│ Cabin sensors │── CO₂ ──┐                           │
│ Meal log      │── salt ─┼──▶ EnvLog table ──────────┤
│ Exercise log  │── mins ─┘                           │
└───────────────┘                                     ▼
                                          ┌──────────────────────┐
                                          │ Scoring Engine       │
                                          │ 1. compare baseline  │
                                          │ 2. check trend       │
                                          │ 3. check env factors │
                                          └──────────┬───────────┘
                                                     ▼
                                          ┌──────────────────────┐
                                          │ Status: 🟢 🟡 🔴      │
                                          │ + reason + actions   │
                                          └───┬──────────────┬───┘
                                              ▼              ▼
                                   ┌──────────────┐  ┌────────────────┐
                                   │ Crew         │  │ Weekly Earth   │
                                   │ Dashboard    │  │ Report (small) │
                                   └──────────────┘  └────────────────┘
```

**In words:**
1. Before launch → astronaut takes the tests a few times → average = their **baseline**
2. Every week → astronaut takes the test → result saved
3. Cabin & lifestyle data saved daily (simulated for the demo)
4. After each test → scoring engine runs → status + reason
5. Crew sees it right away; Earth gets a weekly summary

---

## 7. Frontend: What It Should Look Like

Design style: **dark background, high contrast, big buttons** (works in a dim cabin, easy with gloves/tired eyes). Colours only mean status: 🟢 green, 🟡 amber, 🔴 red.

### Screen 1 — Login / Choose Astronaut
```
┌────────────────────────────────────┐
│          S I G H T L I N E         │
│                                    │
│   Who's testing today?             │
│   [ 👩‍🚀 Commander Osei     ]        │
│   [ 👨‍🚀 Pilot Mensah       ]        │
│   [ 👩‍🚀 Specialist Adjei   ]        │
│                                    │
│   [ Crew Medical View ]            │
└────────────────────────────────────┘
```

### Screen 1b — Body Map (home after login)
```
┌────────────────────────────────────┐
│ Commander Osei · Day 92 · 🔥 12-wk │
│                                    │
│            ( 🔴 )   ← eyes (tap)   │
│             /|\     ← heart 🟢     │
│            / | \                   │
│              |      ← sleep 🟡     │
│             / \                    │
│                                    │
│ 🔴 Eyes: vision drifting. Test now │
│ [ Start Eye Test ]  [ Log Vitals ] │
└────────────────────────────────────┘
```
Tapping a body part opens a card with: what this part does, how space affects it, current status, what to do.

### Screen 2 — Vision Test (4 quick steps, progress bar on top)
```
Step 1/4 · Near Vision           ▓▓░░░░░░
┌────────────────────────────────────┐
│  Hold tablet at arm's length.      │
│                                    │
│            E  F  P  T              │
│                                    │
│  Type the letters you see:         │
│  [ ____ ]          [ Next ▶ ]      │
└────────────────────────────────────┘
(letters get smaller each round)

Step 2/4 · Amsler Grid
┌────────────────────────────────────┐
│  Cover one eye. Look at the dot.   │
│  Tap any lines that look wavy.     │
│  ┼┼┼┼┼┼┼┼┼┼                        │
│  ┼┼┼┼┼●┼┼┼┼   (tapped cells glow)  │
│  ┼┼┼┼┼┼┼┼┼┼                        │
│  [ All lines look straight ] [Next]│
└────────────────────────────────────┘

Step 3/4 · Contrast  → grey letters fading into background
Step 4/4 · Symptoms  → Headache / Eye pressure / Blur  (0–3 sliders)
```

### Screen 3 — Result (astronaut view)
```
┌────────────────────────────────────┐
│   Your result today                │
│        🟡  WATCH                   │
│                                    │
│  Near vision dropped 1 line from   │
│  your normal over 3 weeks.         │
│                                    │
│  What to do:                       │
│  • Retest in 48 hours              │
│  • Tell the Crew Medical Officer   │
│                                    │
│  [ Done ]                          │
└────────────────────────────────────┘
```

### Screen 4 — Crew Dashboard (Medical Officer)
```
┌──────────────────────────────────────────────────┐
│ Mission Day 92                     CO₂: ▲ HIGH   │
├──────────────┬──────────────┬────────────────────┤
│ Osei    🔴   │ Mensah  🟢   │ Adjei   🟡         │
│ ↓2 lines     │ stable       │ ↓1 line            │
└──────────────┴──────────────┴────────────────────┘
│  Trend: Osei — Near vision vs CO₂ (180 days)     │
│  📈 [ line chart: vision score + CO₂ overlay ]   │
│                                                  │
│  ⚠ Insight: Drop followed 5 days of high CO₂     │
│  [ Generate Earth Report ]                       │
└──────────────────────────────────────────────────┘
```

### Screen 5 — Earth Report
One page: crew summary table, trend charts, changed Amsler grids, insight notes, test dates. Export as PDF.

---

## 8. Important Infrastructure

| Part | Tool | Why |
|---|---|---|
**Two separate parts that talk over a JSON API:**

| Part | Tool | Why |
|---|---|---|
| **Backend** | **Python Django + Django REST Framework** | Team knows it; admin panel for free |
| Backend CORS | **django-cors-headers** | Lets the React app call the API |
| Database | **SQLite** (hackathon) → PostgreSQL (later) | Zero setup now, easy upgrade |
| **Frontend** | **React (Vite)** | Separate app; fast dev server |
| Routing | **React Router** | Moves between screens |
| API calls | **fetch / Axios** | Talks to Django API |
| Charts | **Recharts** (or Chart.js) | Trend charts, CO₂ overlay |
| Styling | **Tailwind CSS** | Fast dark-theme UI |
| PDF report | **Browser print / react-to-print** | Earth report |
| Version control | **GitHub**: one repo, `backend/` + `frontend/` folders | Team work |
| Deployment (optional) | Backend: **AWS** EC2 / Elastic Beanstalk or Render · Frontend: **AWS Amplify** or Vercel | Live demo link for judges |

**Local dev:** Django runs on `localhost:8000`, React on `localhost:5173`. Frontend reads the API URL from a `.env` file (`VITE_API_URL`).

**Real-mission version (for the pitch only):** runs on a small onboard server with no internet needed; syncs to Earth when a link is available.

---

## 9. High-Level Design (HLD)

```
┌────────────────────────── ONBOARD SYSTEM ──────────────────────────┐
│                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────┐     │
│  │ React App    │◀───▶│     Django REST Backend              │     │
│  │ (tablet UI)  │JSON │                                      │     │
│  └──────────────┘     │  ┌────────┐ ┌────────┐ ┌───────────┐ │     │
│                       │  │ crew   │ │ checks │ │environment│ │     │
│                       │  └────────┘ └────────┘ └───────────┘ │     │
│                       │       ┌──────────────────────┐       │     │
│                       │       │  scoring (engine)    │       │     │
│                       │       └──────────────────────┘       │     │
│                       │       ┌──────────────────────┐       │     │
│                       │       │  reports             │       │     │
│                       │       └──────────────────────┘       │     │
│                       └──────────────────┬───────────────────┘     │
│                                          ▼                         │
│                                 ┌──────────────────┐               │
│                                 │    Database      │               │
│                                 └──────────────────┘               │
└────────────────────────────────────────┬───────────────────────────┘
                                         │ delayed link (weekly)
                                         ▼
                                ┌──────────────────┐
                                │  Earth: Flight   │
                                │  Surgeon report  │
                                └──────────────────┘
```

**Django apps (one job each):**
- `crew`: astronauts and baselines
- `checks`: vision tests and symptoms
- `environment`: CO₂, salt, exercise
- `scoring`: the brain; turns data into status
- `reports`: API data for the dashboard and Earth report

**React app (frontend, separate):**
- `pages/`: SelectAstronaut, VisionTest, Result, CrewDashboard, EarthReport
- `components/`: NearVisionStep, AmslerGrid, ContrastStep, SymptomSliders, StatusCard, TrendChart
- `api/`: one file with all calls to the Django API

Django only sends and receives JSON. It renders no pages (except the built-in admin, used as a backup tool).

---

## 10. Low-Level Design (LLD)

### 10.1 Database Models

```python
# crew/models.py
class Astronaut(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=50)          # Commander, Pilot, Specialist
    mission_start = models.DateField()

class Baseline(models.Model):
    astronaut = models.OneToOneField(Astronaut, on_delete=models.CASCADE)
    near_vision = models.FloatField()               # smallest line read (lower = better)
    contrast = models.FloatField()                  # faintest level read
    created_at = models.DateTimeField(auto_now_add=True)

# checks/models.py
class VisionCheck(models.Model):
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE)
    date = models.DateField()
    mission_day = models.IntegerField()
    near_vision = models.FloatField()
    contrast = models.FloatField()
    amsler_marks = models.JSONField(default=list)   # e.g. [[3,4],[3,5]] tapped cells
    headache = models.IntegerField(default=0)       # 0–3
    eye_pressure = models.IntegerField(default=0)   # 0–3
    blur = models.IntegerField(default=0)           # 0–3

# environment/models.py
class EnvLog(models.Model):
    date = models.DateField(unique=True)
    co2_mmhg = models.FloatField()                  # cabin CO₂
    salt_mg = models.FloatField()                   # avg crew sodium intake
    exercise_min = models.IntegerField()

# scoring/models.py
class Status(models.Model):
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE)
    check = models.OneToOneField(VisionCheck, on_delete=models.CASCADE)
    level = models.CharField(max_length=10)         # GREEN / AMBER / RED
    reason = models.TextField()
    actions = models.JSONField(default=list)
    env_insight = models.TextField(blank=True)
```

### 10.2 API Endpoints

| Method | URL | Does what |
|---|---|---|
| GET | `/api/astronauts/` | List crew + latest status |
| POST | `/api/checks/` | Submit a vision test → runs scoring → returns status |
| GET | `/api/astronauts/<id>/history/` | All checks + statuses (for charts) |
| GET/POST | `/api/env/` | Read / add environment logs |
| GET | `/api/report/weekly/` | Earth report data |

### 10.3 Scoring Logic (simple and explainable)

```
INPUT: new check, astronaut baseline, last 3 checks, last 7 days of EnvLog

1. drift = new.near_vision - baseline.near_vision     (in "lines")
2. trend = are the last 3 checks each worse than the one before?
3. new_distortion = Amsler marks present now but not last time?
4. symptoms = headache + eye_pressure + blur

RULES:
  RED   if drift >= 2 lines
        OR new_distortion
        OR symptoms >= 6
  AMBER if drift >= 1 line
        OR trend is worsening
        OR symptoms >= 3
  GREEN otherwise

ENV INSIGHT (only if AMBER or RED):
  if avg CO₂ (last 5 days) > normal  → "Drop followed high CO₂"
  if avg salt > normal               → "Drop followed high salt intake"
  if exercise < normal               → "Drop followed low exercise"

ACTIONS:
  GREEN → "Next test in 7 days"
  AMBER → "Retest in 48h", "Inform Medical Officer"
  RED   → "Inform Medical Officer now", "Send priority note to Earth",
          "Flag CO₂ scrubbers for check" (if CO₂ insight)
```

> The exact numbers (2 lines, CO₂ limit, etc.) are **demo values**. In the pitch, say they would be tuned with NASA medical experts.

### 10.4 Fake Data Generator

Django command: `python manage.py seed_mission`
- Creates 3 astronauts with baselines
- Creates 180 days of EnvLog (normal CO₂, with a **high-CO₂ spike around day 80–90**)
- Creates weekly VisionChecks:
  - Mensah: stays stable 🟢
  - Adjei: small wobble 🟡
  - Osei: slowly worsens after the CO₂ spike → 🔴 by day 92
- Runs scoring on every check

### 10.5 Folder Structure
```
sightline/
├── backend/                  # Django (API only)
│   ├── manage.py
│   ├── sightline/            # settings, urls, CORS
│   ├── crew/
│   ├── checks/
│   ├── environment/
│   ├── scoring/
│   │   └── engine.py         # the rules above
│   ├── reports/
│   └── requirements.txt
├── frontend/                 # React (Vite)
│   ├── src/
│   │   ├── pages/            # SelectAstronaut, VisionTest, Result, CrewDashboard, EarthReport
│   │   ├── components/       # AmslerGrid, TrendChart, StatusCard, ...
│   │   ├── api/client.js     # all API calls
│   │   └── App.jsx           # routes
│   ├── .env                  # VITE_API_URL=http://localhost:8000/api
│   └── package.json
└── README.md
```

### 10.6 Example API Exchange

```
POST /api/checks/
{
  "astronaut": 1,
  "date": "2027-04-02",
  "mission_day": 92,
  "near_vision": 3.0,
  "contrast": 1.4,
  "amsler_marks": [[3,4],[3,5]],
  "headache": 2, "eye_pressure": 1, "blur": 2
}

→ 201 Created
{
  "level": "RED",
  "reason": "Near vision 2 lines below your normal; new distortion on grid",
  "actions": ["Inform Medical Officer now", "Send priority note to Earth",
              "Flag CO₂ scrubbers for check"],
  "env_insight": "Drop followed 5 days of high cabin CO₂"
}
```
This is the **contract** between frontend and backend: agree on it on Day 1 so both sides can work at the same time.

---

## 10.7 NASA Data & Resources: Do We Need Them?

**Short answer: no live NASA data API is required to build SightLine.** Real astronaut medical data is private, so all teams simulate crew data. NASA material is what makes the simulation **believable**, and judges look for it.

| Use | Source | How we use it |
|---|---|---|
| Why SANS matters, risk factors, signs | **NASA Human Research Program**: SANS evidence report / risk page | Problem slide, "Learn" page, which tests we chose |
| The 5 hazards | HRP "5 Hazards of Human Spaceflight" | Body map info cards, Learn page |
| Cabin CO₂ levels | NASA reports on ISS CO₂ (higher than on Earth) | Realistic numbers in the seed script |
| Countermeasures | HRP / NTRS papers | Wording of guidance ("under study", not "cure") |
| Basic vitals ranges | HRP / medical references | Colour rules for HR, BP, sleep |

**Check the challenge's Resources tab.** If it lists a dataset or API (for example OSDR/GeneLab), we can add one small feature using it. Paste the Resources tab here and we'll decide. Don't add an API just to say we used one: only if it supports the story.

**Rule for the team:** every number in the seed script or scoring rules should have a source link in the README.

---

## 11. Team Roles (suggested)

| Role | Owns |
|---|---|
| Backend lead (Django) | Models, API, scoring engine |
| Data person | Seed script, realistic numbers, NASA research references |
| Frontend (React) | Vision test screens, dashboard, charts |
| Pitch / design | Slides, demo video, story, challenge-mapping check |

---

## 12. Hackathon Timeline (48 hours)

| When | Goal |
|---|---|
| Day 1 morning | Repo set up, models done, admin working |
| Day 1 afternoon | Seed script + scoring engine working (test in admin/shell) |
| Day 1 evening | Vision test screens + submit to API |
| Day 1 night | Dashboard + trend chart |
| Day 2 morning | Earth report, polish, deploy (optional) |
| Day 2 midday | Demo video, slides, submit |

**Rule:** if something isn't working by its time slot, cut it and move on. The demo story matters more than features.

---

## 13. Demo Story (3 minutes)

1. **Problem (30s):** Space squeezes astronauts' eyes. On Mars, no eye doctor and 20-minute message delays.
2. **Test (45s):** Live 2-minute vision test on the tablet.
3. **The catch (60s):** Jump to Day 92. Osei's near vision has slipped 2 lines → 🔴. Chart shows it started after a CO₂ spike.
4. **Action (30s):** Show advice + one-click Earth report.
5. **Impact (15s):** Same tool helps remote clinics on Earth catch vision loss early.

---

## 14. Honest Limits (say these in the pitch: judges respect it)
- Crew data is **simulated**; risk factors come from published NASA research.
- Links between SANS and CO₂ / salt are **suspected, not proven**. SightLine helps find patterns, it doesn't confirm causes.
- Tablet tests are a **screening aid**, not a replacement for proper eye scans.

---

## 15. Before Submitting: Checklist
- [ ] Section 4 matches the official objectives (done) and the Resources tab (to check)
- [ ] Add links to the NASA sources used (NTRS papers on SANS, Human Research Program)
- [ ] Demo video under the time limit
- [ ] GitHub repo public with README
- [ ] Every team member can explain the scoring rules
