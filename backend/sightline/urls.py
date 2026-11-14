from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.views import HealthView

from .exceptions import api_not_found

# All endpoints from docs/03_API_SPECIFICATION.md go here, one include per app.
api_v1_patterns = [
    path("auth/", include("accounts.urls")),
    path("", include("missions.urls")),  # missions/active/, cabin-logs/
    path("", include("crew.urls")),      # astronauts/...
    path("", include("checks.urls")),    # checks/...
    path("", include("vitals.urls")),    # daily-logs/
    path("", include("reports.urls")),   # body map, trends, engagement, crew overview, weekly report
    # Must stay last: unknown /api/v1/ paths -> standard NOT_FOUND JSON.
    re_path(r"^.*$", api_not_found),
]

urlpatterns = [
    path("", RedirectView.as_view(url="/api/docs/", permanent=False)),
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
    path("api/health/", HealthView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
