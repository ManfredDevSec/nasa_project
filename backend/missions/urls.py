from django.urls import path

from . import views

urlpatterns = [
    path("missions/active/", views.ActiveMissionView.as_view(), name="mission-active"),
    path("cabin-logs/", views.CabinLogView.as_view(), name="cabin-logs"),
]
