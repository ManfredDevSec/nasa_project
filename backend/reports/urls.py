from django.urls import path

from . import views

urlpatterns = [
    path("astronauts/<int:pk>/body-map/", views.BodyMapView.as_view(), name="astronaut-body-map"),
]
