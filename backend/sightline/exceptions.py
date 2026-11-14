"""Standard error format for the whole API (docs/01_SETUP_AND_CONVENTIONS.md §5).

Every error response looks like:
    {"error": {"code": "VALIDATION_ERROR", "message": "...", "details": {...}}}

Raising errors with a spec code from our own code:
    raise ConflictError("No baseline yet.", code="NO_BASELINE")       # 409
    raise BadRequestError("Wrong username or password.", code="INVALID_CREDENTIALS")
"""
import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404, JsonResponse
from django.urls import Resolver404, resolve
from django.views.decorators.csrf import csrf_exempt
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


# --- Errors our own code raises ---------------------------------------------

class SightLineError(exceptions.APIException):
    """Base for errors with a spec error code. Pass `code=` to override the default."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "VALIDATION_ERROR"
    default_detail = "Bad request."

    def __init__(self, message=None, code=None, details=None):
        super().__init__(detail=message or self.default_detail)
        if code:
            self.error_code = code
        self.details = details or {}


class BadRequestError(SightLineError):
    pass


class NotFoundError(SightLineError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"
    default_detail = "Not found."


class ConflictError(SightLineError):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"
    default_detail = "This conflicts with the current state."


# --- Mapping DRF's built-in errors to spec codes -----------------------------

# Order matters: subclasses before their parents.
_CODE_BY_TYPE = [
    (exceptions.ValidationError, "VALIDATION_ERROR"),
    (exceptions.ParseError, "VALIDATION_ERROR"),
    (exceptions.AuthenticationFailed, "NOT_AUTHENTICATED"),
    (exceptions.NotAuthenticated, "NOT_AUTHENTICATED"),
    (exceptions.PermissionDenied, "PERMISSION_DENIED"),
    (exceptions.NotFound, "NOT_FOUND"),
    (exceptions.MethodNotAllowed, "METHOD_NOT_ALLOWED"),
    (exceptions.NotAcceptable, "NOT_ACCEPTABLE"),
    (exceptions.UnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE"),
    (exceptions.Throttled, "THROTTLED"),
]


def error_body(code, message, details=None):
    return {"error": {"code": code, "message": message, "details": details or {}}}


def _code_for(exc):
    if isinstance(exc, SightLineError):
        return exc.error_code
    for exc_type, code in _CODE_BY_TYPE:
        if isinstance(exc, exc_type):
            return code
    return "SERVER_ERROR" if getattr(exc, "status_code", 500) >= 500 else "VALIDATION_ERROR"


def custom_exception_handler(exc, context):
    # Same conversions DRF does, done first so we know the final exception type.
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)  # keeps headers like WWW-Authenticate

    if response is None:
        # Unexpected crash. In DEBUG let Django show the traceback page.
        if settings.DEBUG:
            return None
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            error_body("SERVER_ERROR", "Something went wrong on our side."),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = _code_for(exc)
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail
        details = detail if isinstance(detail, dict) else {"non_field_errors": detail}
        message = "Some fields are invalid."
    else:
        details = getattr(exc, "details", {})
        message = str(exc.detail) if not isinstance(exc.detail, (dict, list)) else str(exc.default_detail)

    response.data = error_body(code, message, details)
    return response


# --- Unknown URLs under /api/v1/ --------------------------------------------

@csrf_exempt  # it only ever answers 404, so a POST must not hit Django's HTML CSRF page
def api_not_found(request, *args, **kwargs):
    """Catch-all for /api/v1/ paths that match no endpoint. Plain Django view so it
    answers 404 (not 401) even without a token."""
    message = f"No endpoint at {request.path}."
    if not request.path.endswith("/"):
        try:
            match = resolve(request.path + "/")
            if match.func is not api_not_found:
                message += f" Did you mean {request.path}/ (with a trailing slash)?"
        except Resolver404:
            pass
    return JsonResponse(error_body("NOT_FOUND", message), status=404)
