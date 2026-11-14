from django.db import models


class EnvLog(models.Model):
    date = models.DateField(unique=True)
    co2_mmhg = models.FloatField(help_text="mmHg")
    sodium_mg = models.FloatField(help_text="mg/day")
    exercise_min = models.PositiveIntegerField(help_text="minutes")

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"EnvLog({self.date})"
