from django.db import models


class Astronaut(models.Model):
    class Role(models.TextChoices):
        COMMANDER = "COMMANDER", "Commander"
        PILOT = "PILOT", "Pilot"
        SPECIALIST = "SPECIALIST", "Specialist"

    name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=Role.choices)
    mission_start = models.DateField()

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name

    def mission_day_for(self, date):
        return (date - self.mission_start).days + 1


class Baseline(models.Model):
    """Pre-flight reference measurements for drift calculations."""
    astronaut = models.OneToOneField(
        Astronaut, on_delete=models.CASCADE, related_name="baseline"
    )
    near_vision = models.FloatField(help_text="logMAR")
    contrast = models.FloatField(help_text="logCS")
    sample_count = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Baseline({self.astronaut})"
