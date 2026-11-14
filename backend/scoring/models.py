from django.core.exceptions import ValidationError
from django.db import models

from core.enums import Eye, Level
from core.validators import between


class Assessment(models.Model):
    """The scoring result for one non-baseline VisionCheck (docs/02 §3.6).

    Produced by the engine (scoring/engine.py, T5) via checks.services.submit_check (T6);
    never typed in. Drifts are baseline − current, so positive = worse, negative = better.
    """

    vision_check = models.OneToOneField("checks.VisionCheck", on_delete=models.CASCADE, related_name="assessment")
    astronaut = models.ForeignKey(
        "crew.Astronaut", on_delete=models.CASCADE, related_name="assessments",
        editable=False, help_text="Copied from the check on save (for fast queries).",
    )
    level = models.CharField(max_length=5, choices=Level.choices)

    near_drift_left = models.DecimalField(max_digits=4, decimal_places=2)
    near_drift_right = models.DecimalField(max_digits=4, decimal_places=2)
    contrast_drift_left = models.DecimalField(max_digits=4, decimal_places=2)
    contrast_drift_right = models.DecimalField(max_digits=4, decimal_places=2)
    worse_eye = models.CharField(max_length=5, choices=Eye.choices, null=True, blank=True)

    symptom_score = models.PositiveSmallIntegerField(validators=between(0, 9))
    new_amsler_left = models.BooleanField(default=False, help_text="Marks now, none in the previous check.")
    new_amsler_right = models.BooleanField(default=False)

    reasons = models.JSONField(default=list, blank=True, help_text="Plain-language sentences.")
    actions = models.JSONField(default=list, blank=True, help_text="[{code, text, priority}]")
    env_insights = models.JSONField(default=list, blank=True, help_text="[{factor, text, value, normal}]")

    escalate_to_earth = models.BooleanField(default=False, help_text="True when RED.")
    next_test_due = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["astronaut", "created_at"]
        indexes = [models.Index(fields=["astronaut", "created_at"])]

    def __str__(self):
        return f"{self.vision_check}: {self.level}"

    def clean(self):
        super().clean()
        if self.vision_check_id and self.vision_check.is_baseline:
            raise ValidationError({"vision_check": "Baseline checks are not scored, so they have no assessment."})

    def save(self, *args, **kwargs):
        self.astronaut_id = self.vision_check.astronaut_id  # always matches its check
        super().save(*args, **kwargs)
