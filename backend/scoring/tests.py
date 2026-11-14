from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase, TestCase

from scoring.engine import evaluate


def _check(**kw):
    defaults = dict(
        near_vision=0.1,
        contrast=1.6,
        amsler_left=[],
        amsler_right=[],
        headache=0,
        eye_pressure=0,
        blur=0,
    )
    defaults.update(kw)
    return SimpleNamespace(**defaults)


def _baseline(near_vision=0.1, contrast=1.6):
    return SimpleNamespace(near_vision=near_vision, contrast=contrast)


def _env(**kw):
    defaults = dict(co2_mmhg=2.0, sodium_mg=3000, exercise_min=150)
    defaults.update(kw)
    return SimpleNamespace(**defaults)


class EvaluateTests(SimpleTestCase):
    def test_green(self):
        result = evaluate(_check(), _baseline(), [], [])
        self.assertEqual(result.level, "GREEN")
        self.assertIn("Vision matches your normal", result.reasons)
        self.assertEqual(result.actions, ["Next test in 7 days"])

    def test_one_line_drift_amber(self):
        result = evaluate(_check(near_vision=0.2), _baseline(near_vision=0.1), [], [])
        self.assertEqual(result.level, "AMBER")
        self.assertTrue(any("1 lines worse" in r for r in result.reasons))

    def test_two_line_drift_red(self):
        result = evaluate(_check(near_vision=0.3), _baseline(near_vision=0.1), [], [])
        self.assertEqual(result.level, "RED")
        self.assertTrue(any("2 lines worse" in r for r in result.reasons))

    def test_contrast_red(self):
        result = evaluate(_check(contrast=1.3), _baseline(contrast=1.6), [], [])
        self.assertEqual(result.level, "RED")
        self.assertTrue(any("Contrast" in r for r in result.reasons))

    def test_trend_amber(self):
        prev = [_check(near_vision=0.1), _check(near_vision=0.15)]
        result = evaluate(_check(near_vision=0.2), _baseline(near_vision=0.0), prev, [])
        self.assertIn(result.level, ("AMBER", "RED"))
        self.assertTrue(any("3 tests" in r for r in result.reasons))

    def test_new_amsler_amber_24h_action(self):
        result = evaluate(_check(amsler_left=[[5, 5]]), _baseline(), [], [])
        self.assertEqual(result.level, "AMBER")
        self.assertIn("new_distortion", result.flags)
        self.assertTrue(any("24 hours" in a for a in result.actions))

    def test_repeated_amsler_red(self):
        prev = [_check(amsler_left=[[5, 5]])]
        result = evaluate(_check(amsler_left=[[5, 5]]), _baseline(), prev, [])
        self.assertEqual(result.level, "RED")
        self.assertTrue(any("again" in r for r in result.reasons))

    def test_symptoms_red(self):
        result = evaluate(_check(headache=3, eye_pressure=3, blur=3), _baseline(), [], [])
        self.assertEqual(result.level, "RED")
        self.assertTrue(any("Symptom score" in r for r in result.reasons))

    def test_co2_insight_and_scrubber_action(self):
        env_logs = [_env(co2_mmhg=4.0), _env(co2_mmhg=4.5)]
        result = evaluate(_check(near_vision=0.2), _baseline(near_vision=0.1), [], env_logs)
        self.assertIn("CO₂", result.env_insight)
        self.assertTrue(any("scrubber" in a for a in result.actions))

    def test_no_insight_when_green(self):
        env_logs = [_env(co2_mmhg=4.0, sodium_mg=4000, exercise_min=50)]
        result = evaluate(_check(), _baseline(), [], env_logs)
        self.assertEqual(result.level, "GREEN")
        self.assertEqual(result.env_insight, "")

    def test_no_baseline(self):
        result = evaluate(_check(), None, [], [])
        self.assertEqual(result.level, "AMBER")
        self.assertTrue(any("baseline" in r.lower() for r in result.reasons))
        self.assertIn("Tell the Crew Medical Officer", result.actions)


class ScoreCheckTest(TestCase):
    def test_score_check_saves_status(self):
        from crew.models import Astronaut, Baseline
        from checks.models import VisionCheck
        from scoring.services import score_check
        from scoring.models import Status

        astronaut = Astronaut.objects.create(
            name="Test Astronaut",
            role="SPECIALIST",
            mission_start=date(2026, 1, 1),
        )
        Baseline.objects.create(
            astronaut=astronaut,
            near_vision=0.1,
            contrast=1.6,
        )
        check = VisionCheck.objects.create(
            astronaut=astronaut,
            date=date(2026, 6, 1),
            near_vision=0.3,
            contrast=1.6,
            amsler_left=[],
            amsler_right=[],
            headache=0,
            eye_pressure=0,
            blur=0,
        )
        status = score_check(check)
        self.assertEqual(status.level, "RED")
        self.assertEqual(Status.objects.filter(vision_check=check).count(), 1)
