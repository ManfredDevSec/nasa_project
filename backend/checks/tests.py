"""T4: VisionCheck validation in the model AND the serializer (docs/06 T4 "Done when")."""
from datetime import datetime, timezone as dt_timezone

from django.core.exceptions import ValidationError
from django.test import TestCase

from core.validators import validate_amsler_cells
from crew.models import Astronaut
from missions.tests import make_mission

from .models import VisionCheck
from .serializers import VisionCheckSerializer

GOOD = dict(
    near_vision_left=8, near_vision_right=8, contrast_left=6, contrast_right=6,
    amsler_left=[], amsler_right=[], headache=0, eye_pressure=0, blur=0,
)


class AmslerValidatorTests(TestCase):
    def test_valid(self):
        for cells in ([], [[0, 0]], [[3, 4], [3, 5], [9, 9]]):
            validate_amsler_cells(cells)

    def test_invalid(self):
        bad = {
            "row 10 (spec example [10, 2])": [[10, 2]],
            "negative": [[-1, 0]],
            "duplicate": [[3, 4], [3, 4]],
            "flat pair, not a list of cells": [3, 4],
            "three numbers": [[1, 2, 3]],
            "text": [["a", 1]],
            "true/false": [[True, 1]],
            "decimal": [[1.5, 2]],
            "not a list": "3,4",
        }
        for label, cells in bad.items():
            with self.subTest(label), self.assertRaises(ValidationError):
                validate_amsler_cells(cells)


class VisionCheckModelTests(TestCase):
    def setUp(self):
        self.osei = Astronaut.objects.create(
            mission=make_mission(), full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER"
        )

    def check(self, **overrides):
        return VisionCheck(astronaut=self.osei, **{**GOOD, **overrides})

    def test_good_values_pass(self):
        self.check().full_clean(exclude=["mission_day"])

    def test_near_vision_11_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            self.check(near_vision_left=11).full_clean(exclude=["mission_day"])
        self.assertEqual(ctx.exception.message_dict["near_vision_left"], ["Must be between 1 and 10."])

    def test_amsler_10_2_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            self.check(amsler_right=[[10, 2]]).full_clean(exclude=["mission_day"])
        self.assertIn("amsler_right", ctx.exception.message_dict)

    def test_every_range(self):
        for field, low, high in [
            ("near_vision_left", 1, 10), ("near_vision_right", 1, 10), ("contrast_left", 1, 8),
            ("contrast_right", 1, 8), ("headache", 0, 3), ("eye_pressure", 0, 3), ("blur", 0, 3),
        ]:
            for value, ok in [(low, True), (high, True), (high + 1, False)] + ([(low - 1, False)] if low > 0 else []):
                with self.subTest(field=field, value=value):
                    c = self.check(**{field: value})
                    if ok:
                        c.full_clean(exclude=["mission_day"])
                    else:
                        with self.assertRaises(ValidationError):
                            c.full_clean(exclude=["mission_day"])

    def test_mission_day_from_taken_at(self):
        c = self.check(taken_at=datetime(2026, 11, 14, 9, 30, tzinfo=dt_timezone.utc))
        c.save()
        self.assertEqual(c.mission_day, 92)
        pre = self.check(is_baseline=True, taken_at=datetime(2026, 7, 16, 9, 0, tzinfo=dt_timezone.utc))
        pre.save()
        self.assertEqual(pre.mission_day, -29)  # pre-flight baseline (docs/05 §4: days -30/-20/-10)

    def test_defaults(self):
        c = VisionCheck.objects.create(
            astronaut=self.osei, near_vision_left=8, near_vision_right=8, contrast_left=6, contrast_right=6,
            headache=1, eye_pressure=1, blur=1,
        )
        self.assertEqual((c.amsler_left, c.amsler_right, c.is_baseline, c.distance_ok, c.notes), ([], [], False, None, ""))
        self.assertIsNotNone(c.taken_at)
        self.assertEqual(c.symptom_score, 3)


class VisionCheckSerializerTests(TestCase):
    """The API input (T7 V1) rejects the same things, with the spec's messages."""

    def setUp(self):
        self.osei = Astronaut.objects.create(
            mission=make_mission(), full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER"
        )

    def payload(self, **overrides):
        return {"astronaut": self.osei.pk, **GOOD, **overrides}

    def test_spec_v1_example_is_valid(self):
        # docs/03 V1 request body
        s = VisionCheckSerializer(data=self.payload(
            is_baseline=False, taken_at="2026-11-14T09:30:00Z", near_vision_left=6, contrast_left=5,
            amsler_left=[[3, 4], [3, 5]], headache=2, eye_pressure=1, blur=2, distance_ok=True, notes="",
        ))
        self.assertTrue(s.is_valid(), s.errors)
        check = s.save()
        self.assertEqual(check.mission_day, 92)

    def test_near_vision_11_rejected(self):
        s = VisionCheckSerializer(data=self.payload(near_vision_left=11))
        self.assertFalse(s.is_valid())
        self.assertEqual(s.errors["near_vision_left"], ["Must be between 1 and 10."])

    def test_amsler_10_2_rejected(self):
        s = VisionCheckSerializer(data=self.payload(amsler_left=[[10, 2]]))
        self.assertFalse(s.is_valid())
        self.assertIn("outside the 10×10 grid", str(s.errors["amsler_left"][0]))

    def test_amsler_duplicate_rejected(self):
        s = VisionCheckSerializer(data=self.payload(amsler_left=[[3, 4], [3, 4]]))
        self.assertFalse(s.is_valid())
        self.assertIn("amsler_left", s.errors)

    def test_optional_fields_can_be_left_out(self):
        data = self.payload()
        for optional in ("amsler_left", "amsler_right"):
            data.pop(optional)
        s = VisionCheckSerializer(data=data)  # no taken_at, amsler, distance_ok, notes
        self.assertTrue(s.is_valid(), s.errors)
        check = s.save()
        self.assertEqual((check.amsler_left, check.amsler_right), ([], []))

    def test_missing_scores_rejected(self):
        s = VisionCheckSerializer(data={"astronaut": self.osei.pk})
        self.assertFalse(s.is_valid())
        self.assertTrue({"near_vision_left", "contrast_right", "headache"} <= set(s.errors))

    def test_read_only_fields_ignored(self):
        s = VisionCheckSerializer(data=self.payload(mission_day=999, id=12345))
        self.assertTrue(s.is_valid(), s.errors)
        check = s.save()
        self.assertNotEqual(check.mission_day, 999)
        self.assertNotEqual(check.pk, 12345)
