from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Astronaut(models.Model):
    """docs/02_DATABASE_SCHEMA.md §3.3."""

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
    def display_name(self) -> str:
        return f"{self.TITLES.get(self.crew_role, '')} {self.full_name}".strip()


def _range(low, high):
    return [MinValueValidator(low), MaxValueValidator(high)]


class Baseline(models.Model):
    """An astronaut's pre-flight "normal" (docs/02 §3.4): the average of all their
    baseline VisionChecks. One row per astronaut, both eyes.

    Not entered by hand: checks.services.submit_check (T6) recomputes it every time a
    VisionCheck with is_baseline=True is saved. Scales (docs/02 §2): near vision 1–10,
    contrast 1–8, higher = better. Averages keep 2 decimals (e.g. 8, 9, 8 → 8.33).
    """

    astronaut = models.OneToOneField(Astronaut, on_delete=models.CASCADE, related_name="baseline")
    near_vision_left = models.DecimalField(max_digits=4, decimal_places=2, validators=_range(1, 10))
    near_vision_right = models.DecimalField(max_digits=4, decimal_places=2, validators=_range(1, 10))
    contrast_left = models.DecimalField(max_digits=4, decimal_places=2, validators=_range(1, 8))
    contrast_right = models.DecimalField(max_digits=4, decimal_places=2, validators=_range(1, 8))
    checks_used = models.PositiveSmallIntegerField(
        default=0, help_text="How many baseline checks went into the average (target 3–5)."
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Baseline({self.astronaut.call_sign}, {self.checks_used} checks)"
