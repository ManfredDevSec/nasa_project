from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def _range(low, high):
    return [MinValueValidator(low), MaxValueValidator(high)]


class DailyLog(models.Model):
    """Vitals + lifestyle, once per day per astronaut (docs/02 §3.7).

    Every value is optional (an astronaut may log only sleep, say). POST acts as an
    upsert on (astronaut, date) in T7. Scored by scoring/vitals_rules.py (T5).
    """

    astronaut = models.ForeignKey("crew.Astronaut", on_delete=models.CASCADE, related_name="daily_logs")
    date = models.DateField()
    mission_day = models.IntegerField(editable=False, help_text="Computed from the date on save.")

    resting_hr_bpm = models.PositiveSmallIntegerField(
        "resting heart rate (bpm)", null=True, blank=True, validators=_range(30, 200)
    )
    systolic_mmhg = models.PositiveSmallIntegerField(
        "systolic BP (mmHg)", null=True, blank=True, validators=_range(70, 220)
    )
    diastolic_mmhg = models.PositiveSmallIntegerField(
        "diastolic BP (mmHg)", null=True, blank=True, validators=_range(40, 140)
    )
    sleep_hours = models.DecimalField(
        max_digits=3, decimal_places=1, null=True, blank=True, validators=_range(0, 24)
    )
    mood = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=_range(1, 5), help_text="1 very low → 5 very good."
    )
    sodium_mg = models.PositiveIntegerField(
        "sodium (mg)", null=True, blank=True, validators=_range(0, 10000)
    )
    exercise_min = models.PositiveSmallIntegerField(
        "exercise (min)", null=True, blank=True, validators=_range(0, 600),
        help_text="Resistive + aerobic minutes.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["astronaut", "date"]
        # The unique constraint also gives the (astronaut, date) index used for history queries.
        constraints = [
            models.UniqueConstraint(fields=["astronaut", "date"], name="one_daily_log_per_astronaut_day")
        ]

    def __str__(self):
        return f"DailyLog({self.astronaut.call_sign}, day {self.mission_day})"

    def save(self, *args, **kwargs):
        self.mission_day = self.astronaut.mission.mission_day(self.date)
        super().save(*args, **kwargs)
