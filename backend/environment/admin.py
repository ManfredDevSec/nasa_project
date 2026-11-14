from django.contrib import admin

from .models import EnvLog


@admin.register(EnvLog)
class EnvLogAdmin(admin.ModelAdmin):
    list_display = ("date", "co2_mmhg", "sodium_mg", "exercise_min")
    list_filter = ("date",)
