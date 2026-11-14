from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction


class Mission(models.Model):
    """docs/02_DATABASE_SCHEMA.md §3.2. Created in T2 because User → Astronaut → Mission.

    T3 adds CabinLog to this app.
    """

    class Environment(models.TextChoices):
        STATION = "STATION", "Space station"
        TRANSIT = "TRANSIT", "Transit"
        MOON_BASE = "MOON_BASE", "Moon base"
        MARS_BASE = "MARS_BASE", "Mars base"

    name = models.CharField(max_length=100)
    environment = models.CharField(max_length=20, choices=Environment.choices)
    # 0.00 station/transit, 0.17 Moon, 0.38 Mars (Mars: docs/08 R3)
    gravity_g = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
    )
    start_date = models.DateField(help_text="Mission day 1.")
    planned_duration_days = models.PositiveIntegerField()
    is_active = models.BooleanField(default=False, help_text="Only one mission can be active.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_active", "-start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_active"],
                condition=models.Q(is_active=True),
                name="only_one_active_mission",
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Activating this mission deactivates any other (02 §3.2: only one active).
        with transaction.atomic():
            if self.is_active:
                Mission.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
            super().save(*args, **kwargs)

    def mission_day(self, date):
        """Day 1 = start_date. Pre-flight dates give 0 or less."""
        return (date - self.start_date).days + 1
