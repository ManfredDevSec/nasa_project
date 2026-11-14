from django.contrib import admin

from .models import Assessment

ASSESSMENT_FIELDS = (
    "level", "worse_eye", "near_drift_left", "near_drift_right", "contrast_drift_left", "contrast_drift_right",
    "symptom_score", "new_amsler_left", "new_amsler_right", "reasons", "actions", "env_insights",
    "escalate_to_earth", "next_test_due", "created_at",
)


class ReadOnlyAssessmentMixin:
    """Assessments come from the scoring engine (T5/T6), never typed in."""

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class AssessmentInline(ReadOnlyAssessmentMixin, admin.StackedInline):
    model = Assessment
    fields = readonly_fields = ASSESSMENT_FIELDS
    can_delete = False
    verbose_name_plural = "Assessment (computed by the scoring engine)"


@admin.register(Assessment)
class AssessmentAdmin(ReadOnlyAssessmentMixin, admin.ModelAdmin):
    list_display = ("astronaut", "mission_day", "level", "worse_eye", "symptom_score", "escalate_to_earth", "next_test_due")
    list_filter = ("level", "escalate_to_earth", "astronaut")
    list_select_related = ("astronaut", "vision_check")
    fields = readonly_fields = ("vision_check", "astronaut", *ASSESSMENT_FIELDS)
    ordering = ("-created_at",)

    @admin.display(description="mission day", ordering="vision_check__mission_day")
    def mission_day(self, obj):
        return obj.vision_check.mission_day
