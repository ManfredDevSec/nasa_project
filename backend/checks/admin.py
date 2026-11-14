from django.contrib import admin

from scoring.admin import AssessmentInline

from .models import VisionCheck


@admin.register(VisionCheck)
class VisionCheckAdmin(admin.ModelAdmin):
    """Note: until T6, a check added here is saved but not scored and doesn't update
    the Baseline. T6 routes admin saves through checks.services.submit_check."""

    list_display = (
        "astronaut", "mission_day", "taken_at", "is_baseline",
        "near_vision_left", "near_vision_right", "contrast_left", "contrast_right",
        "amsler_marks", "symptom_score", "level",
    )
    list_filter = ("astronaut", "is_baseline")
    list_select_related = ("astronaut", "assessment")
    readonly_fields = ("mission_day", "created_at")
    date_hierarchy = "taken_at"
    ordering = ("-taken_at",)
    inlines = [AssessmentInline]

    @admin.display(description="Amsler L/R")
    def amsler_marks(self, obj):
        return f"{len(obj.amsler_left)} / {len(obj.amsler_right)}"

    @admin.display(description="symptoms")
    def symptom_score(self, obj):
        return obj.symptom_score

    @admin.display(description="level")
    def level(self, obj):
        assessment = getattr(obj, "assessment", None)
        return assessment.level if assessment else ("baseline" if obj.is_baseline else "-")
