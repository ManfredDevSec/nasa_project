from django.db import models
from django.utils import timezone

from core.validators import between, validate_amsler_cells


class VisionCheck(models.Model):
    """One eye self-test session, both eyes (docs/02 §3.5).

    Scales (docs/02 §2), higher = better for vision:
      near_vision 1–10 (smallest chart line read), contrast 1–8 (faintest level read),
      symptoms 0–3 each (0 none … 3 severe), amsler = [row, col] cells marked wavy/missing.

    `is_baseline=True` checks are pre-flight reference tests: they build the astronaut's
    Baseline and are never scored. Every other check gets one scoring.Assessment.
    Create checks through checks.services.submit_check (T6), not .objects.create(),
    so the baseline/assessment are kept in step.
    """

    astronaut = models.ForeignKey("crew.Astronaut", on_delete=models.CASCADE, related_name="vision_checks")
    taken_at = models.DateTimeField(default=timezone.now)
    mission_day = models.IntegerField(editable=False, help_text="Computed from taken_at on save.")
    is_baseline = models.BooleanField(default=False, help_text="Pre-flight baseline test (not scored).")

    near_vision_left = models.PositiveSmallIntegerField(validators=between(1, 10))
    near_vision_right = models.PositiveSmallIntegerField(validators=between(1, 10))
    contrast_left = models.PositiveSmallIntegerField(validators=between(1, 8))
    contrast_right = models.PositiveSmallIntegerField(validators=between(1, 8))
    amsler_left = models.JSONField(default=list, blank=True, validators=[validate_amsler_cells])
    amsler_right = models.JSONField(default=list, blank=True, validators=[validate_amsler_cells])

    headache = models.PositiveSmallIntegerField(validators=between(0, 3))
    eye_pressure = models.PositiveSmallIntegerField(validators=between(0, 3))
    blur = models.PositiveSmallIntegerField(validators=between(0, 3))

    distance_ok = models.BooleanField(null=True, blank=True, help_text="Optional camera check; empty = not checked.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["astronaut", "taken_at"]
        indexes = [models.Index(fields=["astronaut", "taken_at"])]

    def __str__(self):
        kind = "baseline" if self.is_baseline else "check"
        return f"{self.astronaut.call_sign} {kind}, day {self.mission_day}"

    def save(self, *args, **kwargs):
        self.mission_day = self.astronaut.mission.mission_day(timezone.localdate(self.taken_at))
        super().save(*args, **kwargs)

    @property
    def symptom_score(self):
        """headache + eye_pressure + blur, 0–9 (docs/04 step 4)."""
        return self.headache + self.eye_pressure + self.blur
