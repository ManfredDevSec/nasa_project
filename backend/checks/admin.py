from django import forms
from django.contrib import admin, messages

from crew.models import Baseline
from scoring.admin import AssessmentInline

from . import services
from .models import VisionCheck

NO_BASELINE_MESSAGE = (
    "This astronaut has no baseline yet. First add their pre-flight baseline checks "
    "(tick “Is baseline”), then this check can be scored."
)


class VisionCheckAdminForm(forms.ModelForm):
    class Meta:
        model = VisionCheck
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        astronaut = cleaned.get("astronaut")
        if astronaut and not cleaned.get("is_baseline") and not Baseline.objects.filter(astronaut=astronaut).exists():
            raise forms.ValidationError(NO_BASELINE_MESSAGE)
        return cleaned


@admin.register(VisionCheck)
class VisionCheckAdmin(admin.ModelAdmin):
    """Adding a check here goes through checks.services (same as the API): baseline checks
    update the Baseline, other checks are scored. Saved checks are a record of a test,
    so they can be viewed or deleted but not edited."""

    form = VisionCheckAdminForm
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

    def has_change_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        check, assessment, baseline = services.save_check(obj)
        if assessment:
            self.message_user(request, f"Scored {assessment.level}: {' '.join(assessment.reasons)}", messages.INFO)
        elif baseline:
            self.message_user(request, f"Baseline updated from {baseline.checks_used} baseline check(s).", messages.INFO)

    def delete_model(self, request, obj):
        super().delete_model(request, obj)
        if obj.is_baseline:
            services.recompute_baseline(obj.astronaut)

    def delete_queryset(self, request, queryset):
        astronauts = {c.astronaut for c in queryset if c.is_baseline}
        super().delete_queryset(request, queryset)
        for astronaut in astronauts:
            services.recompute_baseline(astronaut)

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
