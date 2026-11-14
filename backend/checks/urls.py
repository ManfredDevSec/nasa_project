from django.urls import path

from . import views

urlpatterns = [
    path("checks/", views.VisionCheckListView.as_view(), name="check-list"),
    path("checks/<int:pk>/", views.VisionCheckDetailView.as_view(), name="check-detail"),
]
