import logging
import re
import time
import uuid

from .views import HealthView

HEALTH_PATH = "/api/health/"

_health_view = HealthView.as_view()


class HealthCheckMiddleware:
    """Serve /api/health/ before Django checks the Host header.

    Hosting health checks (Render, Docker) may call the app with an internal
    hostname that isn't in ALLOWED_HOSTS, which would make Django answer 400 and
    the deploy look unhealthy. The health response only says ok/error, so
    skipping the host check for this one path is safe.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == HEALTH_PATH and request.method in ("GET", "HEAD"):
            response = _health_view(request)
            response.render()
            return response
        return self.get_response(request)


# --- Request logging (docs/06 T13) ---------------------------------------------------

request_logger = logging.getLogger("sightline.requests")
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
REQUEST_ID_HEADER = "X-Request-ID"


class RequestLogMiddleware:
    """One log line per request, and an X-Request-ID on every response.

        INFO sightline.requests: POST /api/v1/checks/ 201 84ms user=2 id=3f9c2a1b7d4e
        INFO sightline.requests: GET /api/v1/astronauts/3/ 403 12ms user=2 id=... code=PERMISSION_DENIED

    Logs method, path (no query string), status, duration, user id and the error code.
    Never logs request bodies, headers, tokens or query strings (they can contain personal data).
    The id is taken from an incoming X-Request-ID (e.g. set by the frontend) or generated, so a
    user can quote it and the matching line can be found in the Render logs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request.request_id = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex[:12]
        started = time.monotonic()
        response = self.get_response(request)
        response[REQUEST_ID_HEADER] = request.request_id
        if not request.path.startswith(SKIP_PREFIXES):
            self._log(request, response, (time.monotonic() - started) * 1000)
        return response

    def _log(self, request, response, ms):
        user = getattr(request, "user", None)
        user_id = user.pk if user is not None and user.is_authenticated else "-"
        line = f"{request.method} {request.path} {response.status_code} {ms:.0f}ms user={user_id} id={request.request_id}"
        code = _error_code(response)
        if code:
            line += f" code={code}"
        level = logging.ERROR if response.status_code >= 500 else logging.INFO
        request_logger.log(level, line)


SKIP_PREFIXES = (HEALTH_PATH, "/static/", "/favicon.ico")


def _error_code(response):
    data = getattr(response, "data", None)  # DRF responses keep the data they rendered
    if response.status_code >= 400 and isinstance(data, dict) and isinstance(data.get("error"), dict):
        return data["error"].get("code")
    return None
