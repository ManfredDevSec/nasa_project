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
make fresh        # build images, start backend + Redis, run migrations, wait until healthy
make superuser    # create an admin login
```

## Quick start (plain Python)

**Needs:** Python 3.12+.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Without Docker there is no Redis; the app falls back to an in-memory cache automatically.

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
| `make seed` | Demo data. **Not available yet** (comes back in task T8) |

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

## What's built so far

| Task (see [`docs/06_BACKEND_TASKS.md`](docs/06_BACKEND_TASKS.md)) | Status |
|---|---|
| T1 Project skeleton, error format, `/api/v1/`, Swagger | ✅ |
| T2 Users, roles, token auth, password change/reset, user admin, permissions | ✅ |
| T3–T6 Models, scoring engine, `submit_check` | in progress ([hand-off](docs/HANDOFF_T3_T6.md)) |
| T7–T11 Endpoints, seed, body map, trends, crew overview, Earth report | to do |
| T12 Deploy (Render + Neon) | to do |

### Endpoints available now

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/auth/login/` | public |
| POST | `/api/v1/auth/logout/` | logged in |
| GET / PATCH | `/api/v1/auth/me/` | logged in |
| POST | `/api/v1/auth/password/change/` | logged in |
| POST | `/api/v1/auth/password/reset/` | public |
| POST | `/api/v1/auth/password/reset/confirm/` | public |
| GET / POST | `/api/v1/auth/users/` | admin |
| GET / PATCH / DELETE | `/api/v1/auth/users/{id}/` | admin |
| GET | `/api/health/` | public |

The full planned API (crew, checks, daily logs, body map, trends, reports) is in
[`docs/03_API_SPECIFICATION.md`](docs/03_API_SPECIFICATION.md).

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
