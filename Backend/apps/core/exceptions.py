"""Consistent JSON error responses for the whole API.

Every error response has the shape::

    {"error": "Human readable message", "code": "machine_code", ...}

Validation errors additionally carry ``fields`` with per-field messages. The
frontend translates known ``code`` values and falls back to ``error``.
"""
import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.views import set_rollback

logger = logging.getLogger(__name__)


class APIError(exceptions.APIException):
    """Base class for domain errors raised by views and services."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The request could not be processed."
    default_code = "bad_request"

    def __init__(self, detail=None, code=None, status_code=None, extra=None):
        super().__init__(detail=detail, code=code)
        if status_code is not None:
            self.status_code = status_code
        self.code = code or self.default_code
        self.extra = extra or {}


class ConflictError(APIError):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current state."
    default_code = "conflict"


class UpstreamError(APIError):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "An external service did not respond correctly. Please try again later."
    default_code = "upstream_unavailable"


class ServiceUnavailableError(APIError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "This feature is temporarily unavailable."
    default_code = "service_unavailable"


def _first_message(data):
    if isinstance(data, dict):
        for value in data.values():
            message = _first_message(value)
            if message:
                return message
        return None
    if isinstance(data, (list, tuple)):
        for value in data:
            message = _first_message(value)
            if message:
                return message
        return None
    return str(data) if data not in (None, "") else None


def api_exception_handler(exc, context):
    if isinstance(exc, Http404):
        exc = exceptions.NotFound("Not found.")
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)

    if response is None:
        view = context.get("view")
        logger.exception("Unhandled error in %s", view.__class__.__name__ if view else "API", exc_info=exc)
        set_rollback()
        return Response(
            {"error": "Something went wrong on our side. Please try again later.", "code": "server_error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, exceptions.ValidationError):
        fields = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}
        payload = {
            "error": _first_message(response.data) or "Invalid input.",
            "code": "validation_error",
            "fields": fields,
        }
    else:
        data = response.data if isinstance(response.data, dict) else {"detail": response.data}
        detail = data.get("detail", _first_message(data))
        code = getattr(exc, "code", None) if isinstance(exc, APIError) else None
        if not code:
            code = data.get("code") or getattr(detail, "code", None) or exc.default_code
        payload = {"error": str(detail) if detail else "Request failed.", "code": str(code)}
        if isinstance(exc, APIError) and exc.extra:
            payload.update(exc.extra)
        if isinstance(exc, exceptions.Throttled) and exc.wait is not None:
            payload["retry_after"] = int(exc.wait)

    response.data = payload
    return response
