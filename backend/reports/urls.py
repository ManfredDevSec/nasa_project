from django.urls import path

from . import views

urlpatterns = [
    path("crew/overview/", views.CrewOverviewView.as_view(), name="crew-overview"),
    path("reports/weekly/", views.WeeklyReportView.as_view(), name="reports-weekly"),
    path("astronauts/<int:pk>/body-map/", views.BodyMapView.as_view(), name="astronaut-body-map"),
    path("astronauts/<int:pk>/trends/", views.TrendsView.as_view(), name="astronaut-trends"),
    path("astronauts/<int:pk>/engagement/", views.EngagementView.as_view(), name="astronaut-engagement"),
]
