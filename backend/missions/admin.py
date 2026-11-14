from django.contrib import admin

from .models import CabinLog, Mission


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("name", "environment", "gravity_g", "start_date", "planned_duration_days", "is_active")
    list_filter = ("environment", "is_active")
    search_fields = ("name",)


@admin.register(CabinLog)
class CabinLogAdmin(admin.ModelAdmin):
    list_display = ("date", "mission_day", "mission", "co2_mmhg", "temperature_c", "humidity_pct")
    list_filter = ("mission",)
    readonly_fields = ("mission_day",)
    date_hierarchy = "date"
    ordering = ("-date",)
