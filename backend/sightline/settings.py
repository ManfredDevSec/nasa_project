"""SightLine settings. See docs/01_SETUP_AND_CONVENTIONS.md §3–4.

Everything environment-specific comes from env vars (or backend/.env locally):
- no DATABASE_URL -> SQLite;  DATABASE_URL set (Render) -> Neon Postgres
- no REDIS_URL    -> in-memory cache;  REDIS_URL set -> Redis
"""
import os
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"
load_dotenv(BASE_DIR / ".env")  # real env vars win over .env values


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# --- Core -------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", False)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.")
    SECRET_KEY = "django-insecure-local-dev-only"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

# Render sets this automatically (e.g. "sightline-api.onrender.com"), so the
# public address works without typing it into DJANGO_ALLOWED_HOSTS.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")  # admin login form

INSTALLED_APPS = [
    "jazzmin",  # admin theme; must come before django.contrib.admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "drf_spectacular",
    # SightLine
    "accounts",
    "missions",
    "crew",
    "checks",
    "vitals",
    "scoring",
    "reports",
    "core",
]

MIDDLEWARE = [
    "core.middleware.HealthCheckMiddleware",  # first: answers /api/health/ before the host check
    "core.middleware.RequestLogMiddleware",  # one log line + X-Request-ID per request
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "sightline.urls"
WSGI_APPLICATION = "sightline.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Auth -------------------------------------------------------------------

AUTH_USER_MODEL = "accounts.User"  # must exist before the first migrate

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# API tokens stop working this many hours after they were issued (default 7 days).
AUTH_TOKEN_TTL_HOURS = int(os.environ.get("AUTH_TOKEN_TTL_HOURS", 24 * 7))

# Login / password endpoints: max attempts per client IP (DRF rate format).
AUTH_THROTTLE_RATE = os.environ.get("AUTH_THROTTLE_RATE", "10/min")

# Password reset: the emailed link opens the frontend, which calls
# POST /api/v1/auth/password/reset/confirm/ with the uid + token from the link.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
PASSWORD_RESET_PATH = "/reset-password"
PASSWORD_RESET_TIMEOUT = int(os.environ.get("PASSWORD_RESET_TIMEOUT", 60 * 60))  # seconds

# --- Email ------------------------------------------------------------------
# No EMAIL_HOST -> emails are printed to the console (local dev, demo).
# EMAIL_HOST set -> real SMTP (e.g. Gmail app password, Brevo, Mailgun).

EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
if EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_TIMEOUT = 10
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "SightLine <no-reply@sightline.local>")

# --- Database ---------------------------------------------------------------
# Local: SQLite. Production: DATABASE_URL (Neon).

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=60,
        conn_health_checks=True,  # Neon closes idle connections; check before reuse
        ssl_require=False,
    )
}
# Neon's pooled connection string (host contains "-pooler") runs PgBouncer,
# which does not support server-side cursors.
if "-pooler" in (DATABASES["default"].get("HOST") or ""):
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Cache ------------------------------------------------------------------
# Redis when REDIS_URL is set (Docker, Render); in-memory otherwise.
# Used by DRF throttling (login rate limit) and any cached reports later.

REDIS_URL = os.environ.get("REDIS_URL", "")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "sightline",
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# --- I18N / time ------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static files (admin + Swagger UI assets) --------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "core.storage.StaticFilesStorage"  # whitenoise, tolerant of folder paths
        )
    },
}

# --- CORS -------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_EXPOSE_HEADERS = ["X-Request-ID"]  # let the frontend read it (to show/quote in bug reports)

# --- Production security (Render terminates HTTPS at its proxy) -------------

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# `check --deploy` warnings we leave on purpose:
# - W008 SECURE_SSL_REDIRECT: Render already redirects HTTP to HTTPS at its edge;
#   redirecting again in Django can break Render's internal health check.
# - W004 HSTS: tells browsers to force HTTPS for the domain and is hard to undo;
#   not worth it for a hackathon *.onrender.com address.
SILENCED_SYSTEM_CHECKS = ["security.W004", "security.W008"]

# --- DRF + API docs ---------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.ExpiringTokenAuthentication",  # `Authorization: Token <key>`
        "rest_framework.authentication.SessionAuthentication",  # browsable API / admin
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_RATES": {"auth": AUTH_THROTTLE_RATE},  # stored in the cache (Redis)
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "sightline.exceptions.custom_exception_handler",
    "DEFAULT_PAGINATION_CLASS": None,
    "COERCE_DECIMAL_TO_STRING": False,  # decimals as JSON numbers (8.33), as in docs/03
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SightLine API",
    "DESCRIPTION": (
        "Astronaut eye-health (SANS) and vitals self-assessment. "
        "Authenticate with `Authorization: Token <key>` (get a key from POST /api/v1/auth/login/)."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- Logging ----------------------------------------------------------------

# One console handler on the root logger; everything (Django + our apps) goes
# through it exactly once. Django's own "django" handlers are removed because they
# would print the same lines a second time. Render shows this console output.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "{levelname} {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": [], "level": "INFO", "propagate": True},
        # Bots probing with fake Host headers get a 400; don't print a traceback for each.
        "django.security.DisallowedHost": {"handlers": [], "propagate": False},
        # 4xx are already in the request log line (with the error code); keep Django's tracebacks for 5xx.
        "django.request": {"handlers": [], "level": "ERROR", "propagate": True},
        # One line per request (core.middleware.RequestLogMiddleware). Quiet while running tests.
        "sightline.requests": {"handlers": [], "level": "WARNING" if TESTING else "INFO", "propagate": True},
    },
}

# --- Admin theme (jazzmin) --------------------------------------------------

JAZZMIN_SETTINGS = {
    "site_title": "SightLine Admin",
    "site_header": "SightLine",
    "site_brand": "SightLine",
    "welcome_sign": "SightLine mission control",
    "copyright": "SightLine · NASA Space Apps 2026",
    "topmenu_links": [{"name": "API docs", "url": "/api/docs/", "new_window": True}],
    "order_with_respect_to": ["accounts", "missions", "crew", "checks", "scoring", "vitals"],
    "icons": {
        "accounts.User": "fas fa-user",
        "auth.Group": "fas fa-users",
        "authtoken.TokenProxy": "fas fa-key",
        "missions.Mission": "fas fa-rocket",
        "missions.CabinLog": "fas fa-wind",
        "crew.Astronaut": "fas fa-user-astronaut",
        "crew.Baseline": "fas fa-ruler",
        "vitals.DailyLog": "fas fa-heartbeat",
        "checks.VisionCheck": "fas fa-eye",
        "scoring.Assessment": "fas fa-traffic-light",
    },
    "related_modal_active": True,
    "show_ui_builder": False,
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "default_theme_mode": "auto",  # follows the browser's light/dark setting
    "navbar": "navbar-dark",
    "sidebar": "sidebar-dark-primary",
    "accent": "accent-info",
}
