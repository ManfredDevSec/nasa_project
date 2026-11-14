from django.db import models


class Status(models.Model):
    class Level(models.TextChoices):
        GREEN = "GREEN", "Green"
        AMBER = "AMBER", "Amber"
        RED = "RED", "Red"

    # "check" conflicts with Model.check() classmethod, so we use vision_check
    vision_check = models.OneToOneField(
        "checks.VisionCheck", on_delete=models.CASCADE, related_name="status"
    )
    level = models.CharField(max_length=5, choices=Level.choices)
    reason = models.TextField()
    actions = models.JSONField(default=list)
    env_insight = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "statuses"

    def __str__(self):
        return f"Status({self.vision_check}, {self.level})"
