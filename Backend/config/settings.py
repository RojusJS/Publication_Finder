"""
Django settings for the Publication Finder backend.

Every value that differs between environments is read from environment
variables (optionally loaded from a local ``.env`` file). See ``.env.example``
for the full list and DOCUMENTATION.md for deployment notes.
"""
import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_str(name, default=""):
    value = os.environ.get(name)
    return default if value is None else value.strip()


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ImproperlyConfigured(f"{name} must be an integer") from exc


def env_list(name, default=None):
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", False)

SECRET_KEY = env_str("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        # Only ever used for local development. Production refuses to start
        # without an explicit secret.
        SECRET_KEY = "dev-only-insecure-secret-key-change-me"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"] if DEBUG else [])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "apps.core",
    "apps.search",
    "apps.accounts",
    "apps.projects",
    "apps.recommendations",
    "apps.insights",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves the admin's static files in production (``runserver`` does it in development).
    *([] if DEBUG else ["whitenoise.middleware.WhiteNoiseMiddleware"]),
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

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

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DB_ENGINE = env_str("DB_ENGINE", "postgresql").lower()

if DB_ENGINE == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": env_str("DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }
elif DB_ENGINE == "postgresql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env_str("DB_NAME"),
            "USER": env_str("DB_USER"),
            "PASSWORD": env_str("DB_PASSWORD"),
            "HOST": env_str("DB_HOST", "localhost"),
            "PORT": env_str("DB_PORT", "5432"),
            "CONN_MAX_AGE": env_int("DB_CONN_MAX_AGE", 60),
            "CONN_HEALTH_CHECKS": True,
        }
    }
else:
    raise ImproperlyConfigured("DB_ENGINE must be 'postgresql' or 'sqlite'")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Cache (used for OpenAlex responses, recommendations and throttling)
# ---------------------------------------------------------------------------

REDIS_URL = env_str("REDIS_URL")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "pf",
            "TIMEOUT": 600,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "publication-finder",
            "TIMEOUT": 600,
            "OPTIONS": {"MAX_ENTRIES": 5000},
        }
    }

# ---------------------------------------------------------------------------
# Authentication & passwords
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# The refresh token lives in an httpOnly cookie so JavaScript never sees it.
AUTH_REFRESH_COOKIE = {
    "NAME": env_str("AUTH_REFRESH_COOKIE_NAME", "pf_refresh"),
    "PATH": "/api/auth/",
    "SAMESITE": env_str("AUTH_REFRESH_COOKIE_SAMESITE", "Lax"),
    "SECURE": env_bool("AUTH_REFRESH_COOKIE_SECURE", not DEBUG),
    "DOMAIN": env_str("AUTH_REFRESH_COOKIE_DOMAIN") or None,
}

# ---------------------------------------------------------------------------
# Django REST framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": (
        ("rest_framework.renderers.JSONRenderer", "rest_framework.renderers.BrowsableAPIRenderer")
        if DEBUG
        else ("rest_framework.renderers.JSONRenderer",)
    ),
    "DEFAULT_PARSER_CLASSES": ("rest_framework.parsers.JSONParser",),
    # ``?format=`` is used by the export endpoint, not for renderer selection.
    "URL_FORMAT_OVERRIDE": None,
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "apps.core.throttling.ScopedThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": env_str("THROTTLE_ANON", "120/min"),
        "user": env_str("THROTTLE_USER", "600/min"),
        "auth": env_str("THROTTLE_AUTH", "30/min"),
        "search": env_str("THROTTLE_SEARCH", "60/min"),
        "recommendations": env_str("THROTTLE_RECOMMENDATIONS", "20/hour"),
        "ai": env_str("THROTTLE_AI", "20/day"),
        "share": env_str("THROTTLE_SHARE", "30/hour"),
        "export": env_str("THROTTLE_EXPORT", "30/hour"),
    },
    "NUM_PROXIES": env_int("NUM_PROXIES", 0),
}

# ---------------------------------------------------------------------------
# CORS / CSRF. In the recommended setup the SPA and API share one origin (Vite
# proxy in development, nginx in production) so CORS is not needed at all.
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", [])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [])

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en"
LANGUAGES = [("en", "English"), ("lt", "Lietuvių")]
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files (only the Django admin uses them)
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        )
    },
}

# ---------------------------------------------------------------------------
# Security hardening (active whenever DEBUG is off)
# ---------------------------------------------------------------------------

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

if not DEBUG:
    if env_bool("DJANGO_BEHIND_HTTPS_PROXY", True):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
    SESSION_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", True)
    CSRF_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", True)
    SECURE_HSTS_SECONDS = env_int("DJANGO_HSTS_SECONDS", 0)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_HSTS_INCLUDE_SUBDOMAINS", False)
    SECURE_HSTS_PRELOAD = env_bool("DJANGO_HSTS_PRELOAD", False)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_LEVEL = env_str("LOG_LEVEL", "INFO").upper()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "default"},
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "urllib3": {"level": "WARNING"},
        "httpx": {"level": "WARNING"},
        "sentence_transformers": {"level": "WARNING"},
    },
}

# ---------------------------------------------------------------------------
# External services
# ---------------------------------------------------------------------------

OPENALEX = {
    "BASE_URL": env_str("OPENALEX_BASE_URL", "https://api.openalex.org").rstrip("/"),
    "API_KEY": env_str("OPENALEX_API_KEY"),
    "MAILTO": env_str("OPENALEX_MAILTO"),
    "TIMEOUT": env_int("OPENALEX_TIMEOUT_SECONDS", 15),
    "MAX_WORKERS": env_int("OPENALEX_MAX_WORKERS", 4),
}

OPENAI_API_KEY = env_str("OPENAI_API_KEY")
OPENAI_MODEL = env_str("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_TIMEOUT_SECONDS = env_int("OPENAI_TIMEOUT_SECONDS", 90)
INSIGHTS_MAX_PUBLICATIONS = env_int("INSIGHTS_MAX_PUBLICATIONS", 50)

EMBEDDINGS_ENABLED = env_bool("EMBEDDINGS_ENABLED", True)
EMBEDDING_MODEL = env_str("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Optional TrueType font (with Lithuanian glyphs) for PDF exports. When empty a
# list of common system fonts is tried, then Helvetica.
PDF_FONT_PATH = env_str("PDF_FONT_PATH")
PDF_FONT_BOLD_PATH = env_str("PDF_FONT_BOLD_PATH")
