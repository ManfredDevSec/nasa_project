"""Validation rules shared by models (full_clean) and DRF serializers.

Written once here so the model and the API can't disagree (docs/06 T4).
"""
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator

# docs/02 §2: the Amsler grid is 10×10, cells are 0-indexed.
AMSLER_GRID_SIZE = 10


def between(low, high):
    """Min/max validators with the spec's message: "Must be between 1 and 10." (docs/01 §5)."""
    message = f"Must be between {low} and {high}."
    return [MinValueValidator(low, message=message), MaxValueValidator(high, message=message)]


def between_messages(low, high):
    """Same wording for DRF fields (DRF replaces model min/max validators with its own messages)."""
    message = f"Must be between {low} and {high}."
    return {"min_value": message, "max_value": message}


def validate_amsler_cells(value):
    """A list of [row, col] cells tapped on the 10×10 Amsler grid (docs/02 §3.5).

    Valid: [] or [[3, 4], [3, 5]]. Each row/col is a whole number 0–9; no cell twice.
    """
    if not isinstance(value, list):
        raise ValidationError("Must be a list of [row, col] cells, e.g. [[3, 4], [3, 5]].")
    last = AMSLER_GRID_SIZE - 1
    seen = set()
    for cell in value:
        is_pair = isinstance(cell, (list, tuple)) and len(cell) == 2
        if not is_pair or not all(isinstance(n, int) and not isinstance(n, bool) for n in cell):
            raise ValidationError(f"Each cell must be a [row, col] pair of whole numbers, got {cell!r}.")
        row, col = cell
        if not (0 <= row <= last and 0 <= col <= last):
            raise ValidationError(
                f"Cell [{row}, {col}] is outside the {AMSLER_GRID_SIZE}×{AMSLER_GRID_SIZE} grid "
                f"(rows and columns are 0–{last})."
            )
        if (row, col) in seen:
            raise ValidationError(f"Cell [{row}, {col}] is listed twice.")
        seen.add((row, col))
