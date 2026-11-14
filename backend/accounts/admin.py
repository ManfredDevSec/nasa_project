from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "display_name", "role", "astronaut", "email", "is_active", "last_login")
    list_filter = ("role", "is_active", "is_staff")
    list_select_related = ("astronaut",)
    autocomplete_fields = ("astronaut",)
    fieldsets = (
        ("SightLine", {"fields": ("role", "astronaut")}),
        *DjangoUserAdmin.fieldsets,
    )
    add_fieldsets = (
        *DjangoUserAdmin.add_fieldsets,
        ("SightLine", {"fields": ("role", "astronaut")}),
    )
