from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.core.exceptions import ValidationError
from django.db import models


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Login account (docs/02_DATABASE_SCHEMA.md §3.1).

    CREW and MEDICAL_OFFICER users are astronauts, so they link to one.
    FLIGHT_SURGEON users are on Earth and have no astronaut.
    """

    class Role(models.TextChoices):
        CREW = "CREW", "Crew"
        MEDICAL_OFFICER = "MEDICAL_OFFICER", "Medical officer"
        FLIGHT_SURGEON = "FLIGHT_SURGEON", "Flight surgeon"
        ADMIN = "ADMIN", "Admin"

    ROLES_WITH_ASTRONAUT = {Role.CREW, Role.MEDICAL_OFFICER}

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CREW)
    astronaut = models.OneToOneField(
        "crew.Astronaut",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user",
        help_text="Required for Crew and Medical officer. Empty for Flight surgeon.",
    )

    objects = UserManager()

    def clean(self):
        super().clean()
        if self.role in self.ROLES_WITH_ASTRONAUT and not self.astronaut_id:
            raise ValidationError({"astronaut": "Crew and Medical officer accounts must link to an astronaut."})
        if self.role == self.Role.FLIGHT_SURGEON and self.astronaut_id:
            raise ValidationError({"astronaut": "Flight surgeon accounts cannot link to an astronaut."})

    @property
    def is_admin_role(self):
        """ADMIN role, or a Django superuser (treated the same everywhere)."""
        return self.is_superuser or self.role == self.Role.ADMIN

    @property
    def display_name(self):
        """e.g. "Cmdr. Ama Osei" for an astronaut, "Dr. Yaw Boateng" for a flight surgeon."""
        if self.astronaut_id:
            return self.astronaut.display_name
        full_name = self.get_full_name()
        if self.role == self.Role.FLIGHT_SURGEON and full_name:
            return f"Dr. {full_name}"
        return full_name or self.username
