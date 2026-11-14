from django.contrib import admin

from .models import DailyLog


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = (
        "astronaut", "date", "mission_day", "resting_hr_bpm", "systolic_mmhg", "diastolic_mmhg",
        "sleep_hours", "mood", "sodium_mg", "exercise_min",
    )
    list_filter = ("astronaut",)
    list_select_related = ("astronaut",)
    readonly_fields = ("mission_day", "created_at", "updated_at")
    date_hierarchy = "date"
    ordering = ("-date",)
