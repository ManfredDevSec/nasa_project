import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-sightline-dev-key-change-in-prod")

def _bool_env(name, default="0"):
    return os.environ.get(name, default).lower() in {"1", "true", "yes", "on"}

DEBUG = _bool_env("DEBUG", "1")
_allowed_default = "localhost,127.0.0.1,0.0.0.0,backend"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", _allowed_default).split(",")

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "crew",
    "checks",
    "environment",
    "scoring",
    "reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "sightline.urls"

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

WSGI_APPLICATION = "sightline.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("SQLITE_PATH", str(BASE_DIR / "db.sqlite3")),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Accra"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

_cors_default = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", _cors_default).split(",")

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

JAZZMIN_SETTINGS = {
    "site_title": "SightLine Admin",
    "site_header": "SightLine",
    "site_brand": "SightLine",
    "welcome_sign": "SightLine mission control",
    "copyright": "SightLine · NASA Space Apps 2026",
    "search_model": ["crew.Astronaut"],
    "topmenu_links": [{"name": "API docs", "url": "/api/docs/", "new_window": True}],
    "order_with_respect_to": ["crew", "checks", "scoring", "environment"],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "crew.Astronaut": "fas fa-user-astronaut",
        "crew.Baseline": "fas fa-ruler",
        "checks.VisionCheck": "fas fa-eye",
        "scoring.Status": "fas fa-traffic-light",
        "environment.EnvLog": "fas fa-wind",
    },
    "related_modal_active": True,
    "show_ui_builder": False,
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "dark_mode_theme": "auto",
    "navbar": "navbar-dark",
    "sidebar": "sidebar-dark-primary",
    "accent": "accent-info",
}

SIGHTLINE_THRESHOLDS = {
    "near_drift_amber": 0.10,
    "near_drift_red": 0.20,
    "contrast_drop_amber": 0.15,
    "contrast_drop_red": 0.30,
    "symptoms_amber": 3,
    "symptoms_red": 6,
    "co2_mmhg_high": 3.0,
    "sodium_mg_high": 3500,
    "exercise_min_low": 120,
    "env_window_days": 5,
}
