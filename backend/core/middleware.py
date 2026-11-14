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
