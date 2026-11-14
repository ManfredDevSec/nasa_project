from django.urls import path

from . import views

urlpatterns = [
    path("astronauts/", views.AstronautListView.as_view(), name="astronaut-list"),
    path("astronauts/<int:pk>/", views.AstronautDetailView.as_view(), name="astronaut-detail"),
    path("astronauts/<int:pk>/baseline/", views.BaselineView.as_view(), name="astronaut-baseline"),
]
