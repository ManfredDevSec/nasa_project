"""T3: Baseline."""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from missions.tests import make_mission

from .models import Astronaut, Baseline


class BaselineTests(TestCase):
    def setUp(self):
        self.osei = Astronaut.objects.create(
            mission=make_mission(), full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER"
        )

    def test_keeps_two_decimals(self):
        # Osei's right-eye baseline checks are 8, 9, 8 (docs/05 §4) -> 8.33
        b = Baseline.objects.create(
            astronaut=self.osei, near_vision_left=Decimal("8.00"), near_vision_right=Decimal("8.33"),
            contrast_left=Decimal("6"), contrast_right=Decimal("6"), checks_used=3,
        )
        b.refresh_from_db()
        self.assertEqual(b.near_vision_right, Decimal("8.33"))
        self.assertEqual(self.osei.baseline, b)

    def test_one_per_astronaut(self):
        values = dict(near_vision_left=8, near_vision_right=8, contrast_left=6, contrast_right=6)
        Baseline.objects.create(astronaut=self.osei, **values)
        with self.assertRaises(IntegrityError):
            Baseline.objects.create(astronaut=self.osei, **values)

    def test_scales(self):
        b = Baseline(astronaut=self.osei, near_vision_left=11, near_vision_right=8, contrast_left=6, contrast_right=9)
        with self.assertRaises(ValidationError) as ctx:
            b.full_clean()
        self.assertEqual(set(ctx.exception.message_dict), {"near_vision_left", "contrast_right"})
