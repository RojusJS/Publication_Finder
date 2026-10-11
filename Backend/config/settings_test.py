"""Settings used by the automated test-suite (fast, isolated, no network)."""
import os

os.environ.setdefault("DJANGO_DEBUG", "true")
os.environ.setdefault("DB_ENGINE", "sqlite")

from config.settings import *  # noqa: E402,F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "publication-finder-tests",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Tests never download the sentence-transformer model; the TF-IDF fallback is
# exercised instead and the model is mocked where a test needs it.
EMBEDDINGS_ENABLED = False

OPENALEX = {**OPENALEX, "API_KEY": "", "MAILTO": "", "MAX_WORKERS": 1}  # noqa: F405
OPENAI_API_KEY = ""

REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_THROTTLE_RATES": {
        key: "10000/min" for key in REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]  # noqa: F405
    },
}

LOGGING = {"version": 1, "disable_existing_loggers": False}
