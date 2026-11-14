# SightLine

NASA Space Apps Challenge 2026 project. Astronauts on long missions run a quick weekly **eye self-test**
plus a daily **vitals log**. SightLine compares each result with the astronaut's own pre-flight baseline,
flags early signs of **Spaceflight Associated Neuro-ocular Syndrome (SANS)** as GREEN / AMBER / RED,
and tells the crew what to do next without waiting for Earth.

> NASA's Human Research Program calls SANS (earlier: VIIP) "currently NASA's leading spaceflight-related
> health risk" ([HRP risks](https://www.nasa.gov/hrp/risks/)). All scoring thresholds in this project are
> **demo values**; a real system would set them with NASA flight surgeons.

This repo holds the **backend** (Django REST API). The frontend (React) talks to it via the contract in
[`docs/03_API_SPECIFICATION.md`](docs/03_API_SPECIFICATION.md).

---

## Quick start (Docker, recommended)

**Needs:** Docker + `make`. On Windows use WSL.

```bash
make fresh        # build images, start backend + Redis, run migrations, load the demo data
```

## Quick start (plain Python)

**Needs:** Python 3.12+.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_mission     # demo data + logins (see below)
python manage.py runserver
```

Without Docker there is no Redis; the app falls back to an in-memory cache automatically.

## Demo data and logins

`seed_mission` loads a simulated story (docs/05): **Ares Transit 1** (active Mars transit, today = day 92),
plus two finished missions, **Artemis Base 2** (Moon) and **Gateway Station 9** (station): 12 astronauts.
Commander Osei's left eye drifts after a CO₂ scrubber problem (AMBER day 84, RED day 91); her day-92 test is
left for the live demo.

| Login | Role |
|---|---|
| `osei`, `mensah`, `asante`, `owusu`, `appiah` | Crew, Ares Transit 1 |
| `adjei` | Medical Officer, Ares Transit 1 |
| `frimpong`, `agyeman` / `quaye` (MO) | Artemis Base 2 (Moon) |
| `bonsu`, `sarpong` / `tetteh` (MO) | Gateway Station 9 |
| `surgeon` | Flight surgeon on Earth (read-only, all missions) |
| `admin` | Admin + Django admin |

Password for all: `sightline-demo`, or whatever `SEED_DEMO_PASSWORD` is set to. Rerun with
`seed_mission --reset` (keeps superusers, e.g. your own admin). All crew data is simulated.

## URLs

| What | URL |
|---|---|
| API docs (Swagger) | http://localhost:8000/api/docs/ |
| API base | http://localhost:8000/api/v1/ |
| Health check | http://localhost:8000/api/health/ |
| Django admin | http://localhost:8000/admin/ |
| OpenAPI schema | http://localhost:8000/api/schema/ |

**Trying the API in Swagger:** call `POST /api/v1/auth/login/`, copy the `token`, click **Authorize**, and paste
**only the token**.

## Make commands (run from the repo root)

| Command | What it does |
|---|---|
| `make fresh` | Build + start everything (first run / after pulling new packages) |
| `make up` / `make down` | Start (waits until healthy) / stop |
| `make logs` / `make logs-backend` | Follow logs (password-reset emails print here) |
| `make test` / `make test app=scoring` | Run all tests / one app |
| `make migrate` / `make makemigrations` | Database migrations |
| `make superuser` | Create an admin login |
| `make shell` / `make bash` | Django shell / shell inside the backend container |
| `make reset-db` | **Delete** the local database and start fresh |
| `make seed` | Wipe mission data and load the demo story (12 astronauts, 3 missions). Superusers are kept |

## Configuration

All settings come from environment variables; see [`backend/.env.example`](backend/.env.example) for every
option with comments. The important ones:

| Variable | Local default | Production (Render) |
|---|---|---|
| `DJANGO_DEBUG` | `True` (in `.env`) | `False` |
| `DJANGO_SECRET_KEY` | dev key | long random value (**required**) |
| `DATABASE_URL` | unset → SQLite | Neon Postgres connection string |
| `REDIS_URL` | unset → in-memory cache (Docker sets Redis) | Redis URL (optional) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | the frontend's URL |
| `FRONTEND_URL` | `http://localhost:5173` | the frontend's URL (password-reset links) |
| `EMAIL_HOST` … | unset → emails print to the console | SMTP settings |

## Deploy (Render + Neon)

Production runs on **Render** (free web service) with a **Neon** Postgres database. The service is defined in
[`render.yaml`](render.yaml): it deploys the `main` branch from `backend/`, and every merge to `main` redeploys.

1. **Neon:** create a project in region **AWS Europe Central (Frankfurt)**, same as Render. Create a database
   `sightline` and copy the **pooled** connection string (host contains `-pooler`, ends with `?sslmode=require`).
2. **Render:** New → **Blueprint** → pick this repo → it reads `render.yaml` → paste the Neon string when asked
   for `DATABASE_URL` → Apply. Build = install + collectstatic + migrate; start = gunicorn.
3. **Check:** `https://<service>.onrender.com/api/health/` → `"database": "ok"`, then `/api/docs/`.

**Admin user and seed:** Render's free plan has **no Shell**, so run management commands **from your laptop
against Neon**:
```bash
cd backend && source .venv/bin/activate
DATABASE_URL='<neon pooled connection string>' python manage.py createsuperuser
SEED_DEMO_PASSWORD='<pick one>' DATABASE_URL='<neon pooled connection string>' python manage.py seed_mission --reset
```

**Free plan notes:** the service sleeps after 15 min without traffic, and the first request then takes about
a minute. **Open the URL a few minutes before a demo.** Password-reset emails print in the Render logs until
`EMAIL_HOST` etc. are set. Add the deployed frontend's URL to `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` in the
Render dashboard once it exists.

## What's built so far

| Task (see [`docs/06_BACKEND_TASKS.md`](docs/06_BACKEND_TASKS.md)) | Status |
|---|---|
| T1 Project skeleton, error format, `/api/v1/`, Swagger | ✅ |
| T2 Users, roles, token auth, password change/reset, user admin, permissions | ✅ |
| T3–T6 Models, scoring engine, `submit_check` | ✅ |
| T7 Core endpoints (mission, crew, checks, daily/cabin logs) | ✅ |
| T8 Demo data (`seed_mission`) | ✅ |
| T9–T11 Body map, trends, engagement, crew overview, Earth report | ✅ |
| T12 Deploy (Render + Neon) | ✅ (seed the live DB from your laptop) |
| T13 Polish: login rate limit, request logging, README, Postman collection | ✅ |

### Endpoints

All under `/api/v1/` unless noted. Exact shapes: [`docs/03_API_SPECIFICATION.md`](docs/03_API_SPECIFICATION.md)
and Swagger at `/api/docs/`.

| Method | Path | Who | What |
|---|---|---|---|
| POST | `auth/login/` | public | Token for a username + password |
| POST | `auth/logout/` | logged in | Revoke your token |
| GET / PATCH | `auth/me/` | logged in | Your account / edit email and name |
| POST | `auth/password/change/` | logged in | New password (returns a new token) |
| POST | `auth/password/reset/`, `…/confirm/` | public | Forgot-password email + set a new one |
| GET / POST | `auth/users/` | admin | List / create (email invite) users |
| GET / PATCH / DELETE | `auth/users/{id}/` | admin | One user / edit / deactivate |
| GET | `missions/active/` | everyone | Active mission + today's mission day |
| GET | `astronauts/` | everyone | Crew list with latest status (crew see crewmates' colour only) |
| GET | `astronauts/{id}/`, `…/baseline/` | own / crew (MO) / all (surgeon) | Astronaut, pre-flight baseline |
| POST | `checks/` | own / crew (MO) | **Submit an eye test → scored result** |
| GET | `checks/`, `checks/{id}/` | as above | Test history with results |
| GET / POST | `daily-logs/` | as above | Vitals history / log a day (returns traffic lights) |
| GET / POST | `cabin-logs/` | everyone / MO, admin | Cabin CO₂ history / log a day |
| GET | `astronauts/{id}/body-map/` | as above | Eyes, heart, sleep, mind with info cards |
| GET | `astronauts/{id}/trends/` | as above | Chart series by mission day + events |
| GET | `astronauts/{id}/engagement/` | as above | Streak, badges, next test due |
| GET | `crew/overview/` | MO, surgeon, admin | Crew dashboard with alerts |
| GET | `reports/weekly/` | MO, surgeon, admin | Weekly report for Earth |
| GET | `/api/health/` | public | Database + cache check |

### Try the API in Postman / Thunder Client

Import [`docs/api/SightLine.postman_collection.json`](docs/api/SightLine.postman_collection.json) and one
environment (`SightLine-local` or `SightLine-live`) from [`docs/api/`](docs/api/). Run **Auth → Log in**
(defaults to `osei` / `sightline-demo`; change the `username` / `password` collection variables): the token and
your astronaut id are saved, and every other request just works. After changing the API, regenerate the files
with `python manage.py export_postman` (a test fails if they're out of date).

### Logs

Every request gets one line in the server log (Render → Logs), e.g.
`INFO sightline.requests: GET /api/v1/astronauts/3/ 403 12ms user=2 id=3f9c2a1b7d4e code=PERMISSION_DENIED`,
and an `X-Request-ID` response header with the same id: quote it in bug reports to find the line. Bodies,
tokens and query strings are never logged.

**Roles:** `CREW` sees and edits only their own data · `MEDICAL_OFFICER` sees and edits the whole crew ·
`FLIGHT_SURGEON` (on Earth) reads everything, edits nothing · `ADMIN` does everything.
There is no public sign-up: admins create accounts (with an email invite).

## Project layout

```
backend/
├── sightline/   settings, URLs, standard error format
├── accounts/    users, roles, auth endpoints, permission helpers
├── missions/    Mission (+ CabinLog)
├── crew/        Astronaut (+ Baseline)
├── checks/      VisionCheck + submit_check service
├── vitals/      DailyLog
├── scoring/     Assessment, scoring engine, all thresholds (config.py)
├── reports/     body map / trends / reports (computed, no tables)
└── core/        shared helpers, health check
docs/            specs 01–08: read these before changing anything
```

## Docs

| File | What |
|---|---|
| [01 Setup & conventions](docs/01_SETUP_AND_CONVENTIONS.md) | Stack, settings, coding rules |
| [02 Database schema](docs/02_DATABASE_SCHEMA.md) | Models and scales |
| [03 API specification](docs/03_API_SPECIFICATION.md) | **The contract with the frontend** |
| [04 Scoring rules](docs/04_SCORING_RULES.md) | How GREEN / AMBER / RED is decided, with test cases |
| [05 Seed data](docs/05_SEED_DATA_SPEC.md) | The demo story |
| [06 Backend tasks](docs/06_BACKEND_TASKS.md) | Build order T1–T13 |
| [07 Sources](docs/07_SOURCES.md) · [08 NASA resources](docs/08_NASA_RESOURCES.md) | Facts we're allowed to use, and where they come from |

## Sources

Health facts in the app come only from these NASA pages (summarised in
[`docs/08_NASA_RESOURCES.md`](docs/08_NASA_RESOURCES.md)):

- NASA HRP, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS): https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/
- Risk of Cardiovascular Adaptations: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- Risk from Inadequate Sleep and Irregular Schedules: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
- Risk of Behavioral Conditions and Psychiatric Disorders: https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/
- 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- Ongoing HRP Research: https://www.nasa.gov/hrp/ongoing-hrp-research/

All crew data is simulated. Scoring thresholds are demo values, not clinical standards.
