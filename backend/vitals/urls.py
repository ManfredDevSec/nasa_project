from django.urls import path

from . import views

urlpatterns = [
    path("daily-logs/", views.DailyLogView.as_view(), name="daily-logs"),
]
