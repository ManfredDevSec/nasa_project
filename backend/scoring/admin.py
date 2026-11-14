from django.contrib import admin

from .models import Status


@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ("id", "vision_check", "level", "created_at")
    list_filter = ("level",)
    readonly_fields = ("created_at",)
