from django.contrib import admin

from .models import Astronaut, Baseline

BASELINE_FIELDS = ("near_vision_left", "near_vision_right", "contrast_left", "contrast_right", "checks_used", "updated_at")


class ReadOnlyBaselineMixin:
    """Baselines are computed from baseline VisionChecks (T6), never typed in."""

    readonly_fields = BASELINE_FIELDS
    fields = BASELINE_FIELDS

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class BaselineInline(ReadOnlyBaselineMixin, admin.StackedInline):
    model = Baseline
    can_delete = False
    verbose_name_plural = "Baseline (computed from pre-flight baseline checks)"


@admin.register(Astronaut)
class AstronautAdmin(admin.ModelAdmin):
    list_display = ("call_sign", "full_name", "crew_role", "is_medical_officer", "mission", "test_interval_days")
    list_filter = ("mission", "crew_role", "is_medical_officer")
    search_fields = ("full_name", "call_sign")
    inlines = [BaselineInline]


@admin.register(Baseline)
class BaselineAdmin(ReadOnlyBaselineMixin, admin.ModelAdmin):
    list_display = ("astronaut", *BASELINE_FIELDS)
    list_filter = ("astronaut__mission",)
    fields = ("astronaut", *BASELINE_FIELDS)
    readonly_fields = ("astronaut", *BASELINE_FIELDS)
