from django.core.validators import MinValueValidator
from django.db import models


class Astronaut(models.Model):
    """docs/02_DATABASE_SCHEMA.md §3.3. Created in T2 because a User links to one.

    T3 adds Baseline to this app.
    """

    class CrewRole(models.TextChoices):
        COMMANDER = "COMMANDER", "Commander"
        PILOT = "PILOT", "Pilot"
        SPECIALIST = "SPECIALIST", "Specialist"
        ENGINEER = "ENGINEER", "Engineer"

    # Short title used in display names, e.g. "Cmdr. Ama Osei" (docs/03 A1).
    TITLES = {
        CrewRole.COMMANDER: "Cmdr.",
        CrewRole.PILOT: "Pilot",
        CrewRole.SPECIALIST: "Specialist",
        CrewRole.ENGINEER: "Engineer",
    }

    mission = models.ForeignKey(
        "missions.Mission", on_delete=models.CASCADE, related_name="astronauts"
    )
    full_name = models.CharField(max_length=100)
    call_sign = models.CharField(max_length=30, help_text='Short display name, e.g. "Osei".')
    crew_role = models.CharField(max_length=20, choices=CrewRole.choices)
    is_medical_officer = models.BooleanField(default=False)
    avatar_url = models.URLField(max_length=255, blank=True)
    test_interval_days = models.PositiveSmallIntegerField(
        default=7, validators=[MinValueValidator(1)], help_text="Days between routine eye tests."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.call_sign} ({self.get_crew_role_display()})"

    @property
    def display_name(self):
        return f"{self.TITLES.get(self.crew_role, '')} {self.full_name}".strip()
