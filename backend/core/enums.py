"""Shared enums (docs/01 §5: UPPER_CASE strings). Used by models, the scoring engine and reports."""
from django.db import models


class Level(models.TextChoices):
    """Traffic-light result of an eye assessment (docs/02 §3.6)."""

    GREEN = "GREEN", "Green"
    AMBER = "AMBER", "Amber"
    RED = "RED", "Red"


# Body map / vitals parts with no data yet (docs/03 R1, docs/04 §4). Not a stored Assessment level.
UNKNOWN = "UNKNOWN"


class Eye(models.TextChoices):
    LEFT = "LEFT", "Left"
    RIGHT = "RIGHT", "Right"
    BOTH = "BOTH", "Both"
