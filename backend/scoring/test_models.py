"""T4: Assessment model. (scoring/tests.py is reserved for the T5 engine cases.)"""
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from checks.models import VisionCheck
from crew.models import Astronaut
from missions.tests import make_mission

from .models import Assessment

CHECK = dict(near_vision_left=6, near_vision_right=8, contrast_left=5, contrast_right=6,
             headache=2, eye_pressure=1, blur=2)


def assessment_for(check, **overrides):
    fields = dict(
        vision_check=check, level="RED", near_drift_left=Decimal("2.00"), near_drift_right=Decimal("0.33"),
        contrast_drift_left=Decimal("1.00"), contrast_drift_right=Decimal("0.00"), worse_eye="LEFT",
        symptom_score=5, new_amsler_left=True, reasons=["Left eye near vision is 2 lines below your normal."],
        actions=[{"code": "NOTIFY_MO_NOW", "text": "Tell the Crew Medical Officer now.", "priority": 1}],
        env_insights=[], escalate_to_earth=True, next_test_due=date(2026, 11, 16),
    )
    return Assessment(**{**fields, **overrides})


class AssessmentTests(TestCase):
    def setUp(self):
        self.osei = Astronaut.objects.create(
            mission=make_mission(), full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER"
        )
        self.check = VisionCheck.objects.create(astronaut=self.osei, **CHECK)

    def test_saves_spec_example_and_copies_astronaut(self):
        a = assessment_for(self.check)
        a.save()
        a.refresh_from_db()
        self.assertEqual(a.astronaut, self.osei)
        self.assertEqual(a.near_drift_right, Decimal("0.33"))
        self.assertEqual(a.actions[0]["code"], "NOTIFY_MO_NOW")
        self.assertEqual(self.check.assessment, a)

    def test_one_per_check(self):
        assessment_for(self.check).save()
        with self.assertRaises(IntegrityError):
            assessment_for(self.check).save()

    def test_negative_drift_allowed(self):
        # better than baseline -> negative drift (docs/02 §2)
        a = assessment_for(self.check, level="GREEN", near_drift_left=Decimal("-1.00"), worse_eye=None)
        a.full_clean()
        a.save()

    def test_level_and_eye_choices(self):
        for field, value in [("level", "PURPLE"), ("worse_eye", "MIDDLE"), ("symptom_score", 10)]:
            with self.subTest(field=field), self.assertRaises(ValidationError):
                assessment_for(self.check, **{field: value}).full_clean()

    def test_baseline_checks_have_no_assessment(self):
        baseline = VisionCheck.objects.create(astronaut=self.osei, is_baseline=True, **CHECK)
        with self.assertRaises(ValidationError) as ctx:
            assessment_for(baseline).full_clean()
        self.assertIn("vision_check", ctx.exception.message_dict)
