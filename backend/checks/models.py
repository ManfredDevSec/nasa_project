from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone


class VisionCheck(models.Model):
    astronaut = models.ForeignKey(
        "crew.Astronaut", on_delete=models.CASCADE, related_name="checks"
    )
    date = models.DateField(default=timezone.localdate)
    mission_day = models.IntegerField(blank=True)
    near_vision = models.FloatField(help_text="logMAR")
    contrast = models.FloatField(help_text="logCS")
    # Lists of [row, col] cells flagged on a 20×20 Amsler grid
    amsler_left = models.JSONField(default=list)
    amsler_right = models.JSONField(default=list)
    headache = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(3)])
    eye_pressure = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(3)])
    blur = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(3)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"VisionCheck({self.astronaut}, day {self.mission_day})"

    def save(self, *args, **kwargs):
        if not self.mission_day:
            self.mission_day = self.astronaut.mission_day_for(self.date)
        super().save(*args, **kwargs)

    @property
    def symptom_total(self):
        return self.headache + self.eye_pressure + self.blur

    @property
    def has_distortion(self):
        return bool(self.amsler_left or self.amsler_right)
