from django.urls import path

from .views import (
    AstronautDetailView,
    AstronautHistoryView,
    AstronautListView,
    CheckCreateView,
    EnvListView,
    MissionView,
    WeeklyReportView,
)

urlpatterns = [
    path("astronauts/", AstronautListView.as_view(), name="astronaut-list"),
    path("astronauts/<int:pk>/", AstronautDetailView.as_view(), name="astronaut-detail"),
    path("astronauts/<int:pk>/history/", AstronautHistoryView.as_view(), name="astronaut-history"),
    path("checks/", CheckCreateView.as_view(), name="check-create"),
    path("env/", EnvListView.as_view(), name="env-list"),
    path("mission/", MissionView.as_view(), name="mission"),
    path("report/weekly/", WeeklyReportView.as_view(), name="report-weekly"),
]
