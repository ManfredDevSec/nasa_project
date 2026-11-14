# 01 — Backend Setup & Conventions
**Project:** SightLine (NASA Space Apps 2026) · **Scope:** Backend only (Django REST API)

> Give this file to your AI tool **first**, before any coding task, so every piece of generated code follows the same rules.

---

## 1. Stack

| Thing | Choice | Version (approx.) |
|---|---|---|
| Language | Python | 3.12 |
| Framework | Django | 5.x |
| API | Django REST Framework (DRF) | 3.15+ |
| Auth | DRF **TokenAuthentication** (`rest_framework.authtoken`) | built in |
| API docs | **drf-spectacular** (OpenAPI + Swagger UI) | latest |
| CORS | django-cors-headers | latest |
| Database | **PostgreSQL on Neon** (SQLite fallback for quick local work) | |
| DB URL parsing | dj-database-url | latest |
| Postgres driver | psycopg[binary] (psycopg 3) | latest |
| Static files (admin) | whitenoise | latest |
| Server | gunicorn | latest |
| Env vars | python-dotenv | latest |
| Hosting | **Render** (Web Service) | |

`requirements.txt`
```
Django>=5.0,<6.0
djangorestframework>=3.15
drf-spectacular
django-cors-headers
dj-database-url
psycopg[binary]
gunicorn
whitenoise
python-dotenv
```

---

## 2. Folder Structure

```
backend/
├── manage.py
├── requirements.txt
├── .env                    # never commit
├── .env.example            # commit this
├── sightline/              # project config
│   ├── settings.py
│   ├── urls.py
│   ├── exceptions.py       # custom error format
│   └── wsgi.py
├── accounts/               # custom User, login/logout/me, permissions
├── missions/               # Mission, CabinLog
├── crew/                   # Astronaut, Baseline
├── checks/                 # VisionCheck
├── vitals/                 # DailyLog
├── scoring/                # Assessment model + engine.py + config.py
│   ├── engine.py           # pure functions, no DB writes inside rules
│   ├── vitals_rules.py
│   └── config.py           # ALL thresholds live here
├── reports/                # body map, trends, engagement, crew overview, weekly report (no models)
└── core/                   # shared helpers (mission_day calc, enums)
    └── management/commands/seed_mission.py
```

---

## 3. Environment Variables

`.env.example`
```
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

On Render, set the same keys with production values (`DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS=<your-app>.onrender.com`, `CORS_ALLOWED_ORIGINS=<frontend URL>`).

---

## 4. Key Settings (what the AI must include)

```python
AUTH_USER_MODEL = "accounts.User"          # must exist BEFORE the first migrate

DATABASES = {"default": dj_database_url.config(
    default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    conn_max_age=60, ssl_require=False)}
# Neon: if using the *pooled* connection string (host contains "-pooler"):
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",  # for browsable API/admin
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "sightline.exceptions.custom_exception_handler",
    "DEFAULT_PAGINATION_CLASS": None,
}

SPECTACULAR_SETTINGS = {"TITLE": "SightLine API", "VERSION": "1.0.0"}

MIDDLEWARE: add "corsheaders.middleware.CorsMiddleware" (top) and
            "whitenoise.middleware.WhiteNoiseMiddleware" (after SecurityMiddleware)
STATIC_ROOT = BASE_DIR / "staticfiles"
TIME_ZONE = "UTC"; USE_TZ = True
```

URLs:
```
/admin/                      Django admin
/api/v1/...                  all endpoints (see 03_API_SPECIFICATION.md)
/api/schema/                 OpenAPI JSON
/api/docs/                   Swagger UI  ← share this with the frontend teammate
```

---

## 5. Coding Conventions

- **JSON keys:** `snake_case` everywhere.
- **Dates:** `YYYY-MM-DD`. **Datetimes:** ISO 8601 UTC (`2027-04-02T09:30:00Z`).
- **Enums:** UPPER_CASE strings (`GREEN`, `AMBER`, `RED`, `LEFT`, `MARS`).
- **Views:** DRF `ModelViewSet`/`GenericViewSet` + routers where possible; `APIView` for computed endpoints.
- **Business logic** lives in `scoring/engine.py` and `reports/services.py`, **not** in views or serializers.
- **Thresholds:** never hard-code numbers in logic; import from `scoring/config.py`.
- **Errors:** always the standard format (below).
- **Every endpoint** gets `@extend_schema` with a summary and response example, so the Swagger docs are useful.
- **Tests:** `scoring/tests.py` must cover every worked case in `04_SCORING_RULES.md`.

### Standard error format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "details": { "near_vision_left": ["Must be between 1 and 10."] }
  }
}
```
Codes: `VALIDATION_ERROR` (400), `NOT_AUTHENTICATED` (401), `PERMISSION_DENIED` (403), `NOT_FOUND` (404), `CONFLICT` (409), `SERVER_ERROR` (500).

---

## 6. Local Setup (Fedora)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then paste your Neon DATABASE_URL
python manage.py migrate
python manage.py seed_mission --reset
python manage.py runserver      # http://localhost:8000/api/docs/
```

---

## 7. Deploy: Neon + Render

**Neon**
1. Create project → database `sightline`.
2. Copy the connection string (pooled is fine; keep `?sslmode=require`).

**Render** → New → Web Service → connect GitHub repo
- Root directory: `backend`
- Build command:
  `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- Start command: `gunicorn sightline.wsgi:application`
- Env vars: as in section 3
- After first deploy, open Render **Shell** → `python manage.py seed_mission --reset`

⚠️ **Render free tier sleeps** after inactivity, and the first request takes ~30–60 s. **Open the API URL a few minutes before judging.**

---

## 8. Git

- Branches: `main` (always deployable), `feat/<thing>`.
- Commit `.env.example`, never `.env`.
- `.gitignore`: `.venv/`, `.env`, `db.sqlite3`, `staticfiles/`, `__pycache__/`.
