from django.contrib import admin

from .models import Mission


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("name", "environment", "gravity_g", "start_date", "planned_duration_days", "is_active")
    list_filter = ("environment", "is_active")
    search_fields = ("name",)
