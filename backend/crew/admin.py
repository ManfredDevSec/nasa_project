from django.contrib import admin

from .models import Astronaut, Baseline


class BaselineInline(admin.StackedInline):
    model = Baseline
    extra = 0


@admin.register(Astronaut)
class AstronautAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "role", "mission_start")
    list_filter = ("role",)
    inlines = [BaselineInline]


@admin.register(Baseline)
class BaselineAdmin(admin.ModelAdmin):
    list_display = ("astronaut", "near_vision", "contrast", "sample_count", "created_at")
    list_filter = ("created_at",)
