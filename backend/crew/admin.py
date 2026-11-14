from django.contrib import admin

from .models import Astronaut


@admin.register(Astronaut)
class AstronautAdmin(admin.ModelAdmin):
    list_display = ("call_sign", "full_name", "crew_role", "is_medical_officer", "mission", "test_interval_days")
    list_filter = ("mission", "crew_role", "is_medical_officer")
    search_fields = ("full_name", "call_sign")
