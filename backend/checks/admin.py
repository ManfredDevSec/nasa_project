from django.contrib import admin

from scoring.models import Status

from .models import VisionCheck


class StatusInline(admin.StackedInline):
    model = Status
    extra = 0
    can_delete = False
    readonly_fields = ("level", "reason", "actions", "env_insight", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(VisionCheck)
class VisionCheckAdmin(admin.ModelAdmin):
    list_display = (
        "id", "astronaut", "date", "mission_day",
        "near_vision", "contrast", "symptom_total_display",
    )
    list_filter = ("astronaut", "date")
    readonly_fields = ("mission_day", "created_at")
    inlines = [StatusInline]

    @admin.display(description="symptoms")
    def symptom_total_display(self, obj):
        return obj.symptom_total
