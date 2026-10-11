import logging

from django.core.cache import cache
from django.db import connection
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthView(APIView):
    """Liveness/readiness probe used by Docker and load balancers."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request):
        checks = {"database": "ok", "cache": "ok"}
        try:
            connection.ensure_connection()
        except Exception:  # pragma: no cover - depends on infrastructure
            logger.exception("Health check: database unavailable")
            checks["database"] = "error"
        try:
            cache.set("health-check", "1", 5)
            if cache.get("health-check") != "1":
                checks["cache"] = "error"
        except Exception:  # pragma: no cover - depends on infrastructure
            logger.exception("Health check: cache unavailable")
            checks["cache"] = "error"

        healthy = all(value == "ok" for value in checks.values())
        return Response(
            {"status": "ok" if healthy else "degraded", "checks": checks},
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
