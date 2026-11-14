"""T5: scoring engine. Every worked case in docs/04 §5 (eyes 1–14 + vitals), plus edge cases.

Baseline for all cases: near L/R = 8/8, contrast L/R = 6/6, microgravity, no prior checks
unless stated (docs/04 §5).
"""
from datetime import date, timedelta
from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.permissions import AllowAny
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from checks.models import VisionCheck
from scoring.models import Assessment

from . import config
from .engine import (
    PATTERN_NOTE, BaselineInput, CabinDay, CheckInput, Context, LifestyleDay, PreviousCheck, assess,
    gravity_multiplier,
)
from .exceptions import NoBaselineError
from .vitals_rules import heart_part_status, vitals_status

TODAY = date(2026, 11, 14)
BASELINE = BaselineInput(near_vision_left=8, near_vision_right=8, contrast_left=6, contrast_right=6)


def check(near=(8, 8), contrast=(6, 6), amsler=((), ()), symptoms=(0, 0, 0), on=TODAY):
    return CheckInput(
        taken_on=on, near_vision_left=near[0], near_vision_right=near[1],
        contrast_left=contrast[0], contrast_right=contrast[1],
        amsler_left=tuple(amsler[0]), amsler_right=tuple(amsler[1]),
        headache=symptoms[0], eye_pressure=symptoms[1], blur=symptoms[2],
    )


def context(**overrides):
    return Context(**{"baseline": BASELINE, **overrides})


def high_co2_days(n, before=TODAY, total=7):
    """`total` cabin logs in the 7 days before `before`, the first `n` of them high (4.6 mmHg)."""
    return tuple(
        CabinDay(date=before - timedelta(days=i), co2_mmhg=Decimal("4.6") if i <= n else Decimal("2.4"))
        for i in range(1, total + 1)
    )


def codes(result):
    return [a["code"] for a in result.actions]


class WorkedCasesTests(SimpleTestCase):
    """docs/04 §5, one test per row."""

    def test_case_01_all_normal_is_green(self):
        r = assess(check(), context())
        self.assertEqual(r.level, "GREEN")
        self.assertIsNone(r.worse_eye)
        self.assertEqual(r.reasons, ["Your vision matches your normal. Keep it up."])

    def test_case_02_left_near_drift_1_is_amber(self):
        r = assess(check(near=(7, 8)), context())
        self.assertEqual(r.level, "AMBER")
        self.assertEqual(r.near_drift_left, Decimal("1.00"))
        self.assertEqual(r.worse_eye, "LEFT")
        self.assertIn("Left eye near vision is 1 line below your normal.", r.reasons)

    def test_case_03_left_near_drift_2_is_red(self):
        r = assess(check(near=(6, 8)), context())
        self.assertEqual(r.level, "RED")
        self.assertEqual(r.near_drift_left, Decimal("2.00"))
        self.assertIn("Left eye near vision is 2 lines below your normal.", r.reasons)

    def test_case_04_left_contrast_drift_2_is_red(self):
        r = assess(check(contrast=(4, 6)), context())
        self.assertEqual(r.level, "RED")
        self.assertEqual(r.contrast_drift_left, Decimal("2.00"))
        self.assertIn("Left eye contrast is 2 levels below your normal.", r.reasons)

    def test_case_05_new_amsler_is_red(self):
        previous = (PreviousCheck(near_vision_left=8, near_vision_right=8),)  # no marks
        r = assess(check(amsler=([[3, 4]], [])), context(previous_checks=previous))
        self.assertEqual(r.level, "RED")
        self.assertTrue(r.new_amsler_left)
        self.assertFalse(r.new_amsler_right)
        self.assertIn("New wavy or missing area on the left-eye grid.", r.reasons)

    def test_case_06_existing_amsler_is_amber(self):
        previous = (PreviousCheck(near_vision_left=8, near_vision_right=8, amsler_left=([3, 4],)),)
        r = assess(check(amsler=([[3, 4]], [])), context(previous_checks=previous))
        self.assertEqual(r.level, "AMBER")
        self.assertFalse(r.new_amsler_left)
        self.assertIn("Wavy area still present on the left-eye grid.", r.reasons)

    def test_case_07_symptom_score_3_is_amber(self):
        r = assess(check(symptoms=(1, 1, 1)), context())
        self.assertEqual((r.level, r.symptom_score), ("AMBER", 3))
        self.assertIn("You reported headache, eye pressure and blur (score 3/9).", r.reasons)
        self.assertIn("LOG_SYMPTOMS", codes(r))

    def test_case_08_symptom_score_6_is_red(self):
        r = assess(check(symptoms=(2, 2, 2)), context())
        self.assertEqual((r.level, r.symptom_score), ("RED", 6))

    def test_case_09_both_eyes_drift_is_amber_worse_eye_both(self):
        r = assess(check(near=(7, 7)), context())
        self.assertEqual(r.level, "AMBER")
        self.assertEqual(r.worse_eye, "BOTH")

    def test_case_10_amber_with_high_co2_gets_insight_and_action(self):
        r = assess(check(near=(7, 8)), context(cabin_logs=high_co2_days(4)))
        self.assertEqual(r.level, "AMBER")
        self.assertEqual([i["factor"] for i in r.env_insights], ["CO2"])
        self.assertIn("CHECK_CO2", codes(r))

    def test_case_11_green_never_shows_env_insights(self):
        r = assess(check(), context(cabin_logs=high_co2_days(4)))
        self.assertEqual(r.level, "GREEN")
        self.assertEqual(r.env_insights, [])
        self.assertNotIn("CHECK_CO2", codes(r))

    def test_case_12_steady_decline_is_amber(self):
        previous = tuple(PreviousCheck(near_vision_left=v, near_vision_right=8) for v in (8, 8, 7))
        r = assess(check(near=(7, 8)), context(previous_checks=previous))
        self.assertEqual(r.level, "AMBER")
        self.assertTrue(r.declining_left)
        self.assertFalse(r.declining_right)
        self.assertIn("Left eye vision has dropped over your last 4 tests.", r.reasons)

    def test_case_13_same_drift_on_mars_is_green(self):
        # Mars g = 0.38 → multiplier 1.2 → amber threshold 1.2 > drift 1
        r = assess(check(near=(7, 8)), context(gravity_g=Decimal("0.38")))
        self.assertEqual(r.level, "GREEN")

    def test_case_14_no_baseline_raises(self):
        with self.assertRaises(NoBaselineError):
            assess(check(), context(baseline=None))


class VitalsCasesTests(SimpleTestCase):
    """docs/04 §5 vitals cases + §4 table edges."""

    def test_spec_cases(self):
        self.assertEqual(vitals_status(resting_hr_bpm=64)["heart"]["level"], "GREEN")
        self.assertEqual(vitals_status(resting_hr_bpm=115)["heart"]["level"], "AMBER")
        self.assertEqual(vitals_status(systolic_mmhg=142, diastolic_mmhg=80)["blood_pressure"]["level"], "RED")
        self.assertEqual(vitals_status(sleep_hours=Decimal("6.0"))["sleep"]["level"], "AMBER")
        self.assertEqual(vitals_status(mood=2)["mood"]["level"], "RED")
        self.assertEqual({part: s["level"] for part, s in vitals_status().items()},
                         {"heart": "UNKNOWN", "blood_pressure": "UNKNOWN", "sleep": "UNKNOWN", "mood": "UNKNOWN"})

    def test_heart_rate_edges(self):
        for bpm, level in [(39, "RED"), (40, "AMBER"), (49, "AMBER"), (50, "GREEN"), (100, "GREEN"),
                           (101, "AMBER"), (120, "AMBER"), (121, "RED")]:
            with self.subTest(bpm=bpm):
                self.assertEqual(vitals_status(resting_hr_bpm=bpm)["heart"]["level"], level)

    def test_blood_pressure_edges(self):
        for (sys, dia), level in [((129, 84), "GREEN"), ((130, 70), "AMBER"), ((120, 85), "AMBER"),
                                  ((139, 89), "AMBER"), ((140, 70), "RED"), ((118, 90), "RED"), ((118, None), "UNKNOWN")]:
            with self.subTest(bp=(sys, dia)):
                self.assertEqual(vitals_status(systolic_mmhg=sys, diastolic_mmhg=dia)["blood_pressure"]["level"], level)

    def test_sleep_and_mood_edges(self):
        for hours, level in [(Decimal("7.0"), "GREEN"), (Decimal("6.9"), "AMBER"), (Decimal("5.0"), "AMBER"),
                             (Decimal("4.9"), "RED")]:
            with self.subTest(sleep=hours):
                self.assertEqual(vitals_status(sleep_hours=hours)["sleep"]["level"], level)
        for mood, level in [(5, "GREEN"), (4, "GREEN"), (3, "AMBER"), (2, "RED"), (1, "RED")]:
            with self.subTest(mood=mood):
                self.assertEqual(vitals_status(mood=mood)["mood"]["level"], level)

    def test_d1_example_texts(self):
        status = vitals_status(resting_hr_bpm=64, systolic_mmhg=118, diastolic_mmhg=76, sleep_hours=Decimal("6.0"), mood=3)
        self.assertEqual(status["sleep"]["text"], "6.0 h sleep: below target. Try to protect your sleep window tonight.")
        self.assertEqual(status["mood"]["text"], "Mood is lower than usual. Consider a talk with crew or family.")

    def test_heart_part_is_worse_of_rate_and_pressure(self):
        self.assertEqual(heart_part_status(64, 142, 80)["level"], "RED")
        self.assertEqual(heart_part_status(64, None, None)["level"], "GREEN")  # unknown BP doesn't hide a known rate
        self.assertEqual(heart_part_status(None, None, None)["level"], "UNKNOWN")


class EngineDetailTests(SimpleTestCase):
    def test_spec_v1_example(self):
        """docs/03 V1: near 6/8, contrast 5/6, new left Amsler, symptoms 2,1,2, after 5 high-CO₂ days."""
        baseline = BaselineInput(Decimal("8.00"), Decimal("8.33"), Decimal("6.00"), Decimal("6.00"))
        previous = (PreviousCheck(near_vision_left=7, near_vision_right=8),)
        r = assess(
            check(near=(6, 8), contrast=(5, 6), amsler=([[3, 4], [3, 5]], []), symptoms=(2, 1, 2)),
            Context(baseline=baseline, previous_checks=previous, cabin_logs=high_co2_days(5)),
        )
        self.assertEqual(r.level, "RED")
        self.assertEqual(r.worse_eye, "LEFT")
        self.assertEqual((r.near_drift_left, r.near_drift_right), (Decimal("2.00"), Decimal("0.33")))
        self.assertEqual((r.contrast_drift_left, r.contrast_drift_right), (Decimal("1.00"), Decimal("0.00")))
        self.assertEqual(r.symptom_score, 5)
        self.assertTrue(r.new_amsler_left)
        self.assertTrue(r.escalate_to_earth)
        self.assertEqual(r.next_test_due, date(2026, 11, 16))
        self.assertEqual(codes(r)[:2], ["NOTIFY_MO_NOW", "ESCALATE_EARTH"])
        self.assertTrue({"CHECK_CO2", "RETEST_48H"} <= set(codes(r)))
        co2 = r.env_insights[0]
        self.assertEqual((co2["factor"], co2["normal"]), ("CO2", 2.5))
        self.assertTrue(co2["text"].startswith("This change followed 5 days of high cabin CO₂."))

    def test_insights_say_pattern_not_cause(self):
        """Agreed wording (docs/08 "Known gap"): never claim CO₂/salt/exercise cause SANS."""
        days = tuple(LifestyleDay(TODAY - timedelta(days=i), sodium_mg=4000, exercise_min=40) for i in range(1, 8))
        r = assess(check(near=(7, 8)), context(cabin_logs=high_co2_days(4), daily_logs=days))
        self.assertEqual([i["factor"] for i in r.env_insights], ["CO2", "SODIUM", "EXERCISE"])
        for insight in r.env_insights:
            self.assertTrue(insight["text"].endswith(PATTERN_NOTE))
        self.assertTrue({"REDUCE_SALT", "EXERCISE"} <= set(codes(r)))

    def test_lookback_is_the_days_before_the_check_only(self):
        on_check_day = (CabinDay(TODAY, Decimal("5")),) * 1
        too_old = tuple(CabinDay(TODAY - timedelta(days=d), Decimal("5")) for d in (8, 9, 10))
        r = assess(check(near=(7, 8)), context(cabin_logs=on_check_day + too_old))
        self.assertEqual(r.env_insights, [])
        just_inside = tuple(CabinDay(TODAY - timedelta(days=d), Decimal("5")) for d in (1, 4, 7))
        r = assess(check(near=(7, 8)), context(cabin_logs=just_inside))
        self.assertEqual(r.env_insights[0]["factor"], "CO2")

    def test_missing_lifestyle_data_is_skipped(self):
        days = tuple(LifestyleDay(TODAY - timedelta(days=i)) for i in range(1, 8))  # nothing logged
        r = assess(check(near=(7, 8)), context(daily_logs=days))
        self.assertEqual(r.env_insights, [])

    def test_two_high_co2_days_not_enough(self):
        r = assess(check(near=(7, 8)), context(cabin_logs=high_co2_days(2)))
        self.assertEqual(r.env_insights, [])

    def test_next_test_due(self):
        self.assertEqual(assess(check(), context(test_interval_days=7)).next_test_due, TODAY + timedelta(days=7))
        self.assertEqual(assess(check(), context(test_interval_days=10)).next_test_due, TODAY + timedelta(days=10))
        self.assertEqual(assess(check(near=(7, 8)), context()).next_test_due, TODAY + timedelta(days=2))

    def test_actions_by_level_sorted_by_priority(self):
        self.assertEqual(codes(assess(check(), context())), ["NEXT_WEEKLY"])
        self.assertEqual(codes(assess(check(near=(7, 8)), context())), ["RETEST_48H", "NOTIFY_MO"])
        self.assertEqual(codes(assess(check(near=(6, 8)), context())), ["NOTIFY_MO_NOW", "ESCALATE_EARTH", "RETEST_48H"])
        r = assess(check(near=(6, 8), symptoms=(1, 1, 1)), context(cabin_logs=high_co2_days(4)))
        priorities = [a["priority"] for a in r.actions]
        self.assertEqual(priorities, sorted(priorities))

    def test_fractional_baseline_drift(self):
        # Osei's right eye baseline 8, 9, 8 → 8.33 (docs/05 §4); reading 7 → 1.33 lines
        baseline = BaselineInput(Decimal("8"), Decimal("8.33"), Decimal("6"), Decimal("6"))
        r = assess(check(near=(8, 7)), Context(baseline=baseline))
        self.assertEqual(r.near_drift_right, Decimal("1.33"))
        self.assertIn("Right eye near vision is 1.33 lines below your normal.", r.reasons)

    def test_better_than_baseline_is_negative_drift_and_green(self):
        r = assess(check(near=(9, 9), contrast=(7, 7)), context())
        self.assertEqual((r.level, r.near_drift_left, r.worse_eye), ("GREEN", Decimal("-1.00"), None))

    def test_trend_needs_enough_checks_and_a_real_drop(self):
        two = tuple(PreviousCheck(v, 8) for v in (8,))
        self.assertFalse(assess(check(near=(7, 8)), context(previous_checks=two)).declining_left)  # only 2 points
        flat = tuple(PreviousCheck(v, 8) for v in (8, 8, 8))
        self.assertFalse(assess(check(), context(previous_checks=flat)).declining_left)  # no drop
        bounce = tuple(PreviousCheck(v, 8) for v in (8, 7, 8))
        self.assertFalse(assess(check(near=(7, 8)), context(previous_checks=bounce)).declining_left)  # improved once

    def test_gravity_multipliers(self):
        for g, m in [("0", "1.0"), ("0.05", "1.0"), ("0.17", "1.1"), ("0.38", "1.2"), ("1.0", "1.3"), ("1.5", "1.3")]:
            with self.subTest(g=g):
                self.assertEqual(gravity_multiplier(Decimal(g)), Decimal(m))

    def test_result_fits_the_assessment_model(self):
        stored = {f.name for f in Assessment._meta.get_fields()}
        self.assertTrue(set(assess(check(), context()).model_fields()) <= stored)

    def test_config_matches_spec(self):
        self.assertEqual((config.NEAR_DRIFT_AMBER, config.NEAR_DRIFT_RED, config.SYMPTOM_AMBER, config.SYMPTOM_RED),
                         (1.0, 2.0, 3, 6))
        self.assertEqual(config.GRAVITY_STRICTNESS, {0.05: 1.0, 0.25: 1.1, 0.50: 1.2, 1.00: 1.3})


class NoBaselineApiErrorTests(SimpleTestCase):
    def test_becomes_409_no_baseline(self):
        class View(APIView):
            permission_classes = [AllowAny]

            def get(self, request):
                raise NoBaselineError()

        response = View.as_view()(APIRequestFactory().get("/"))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["error"]["code"], "NO_BASELINE")


# VisionCheck is imported so the test module fails loudly if the T4 model changes shape.
assert {"near_vision_left", "amsler_left", "headache"} <= {f.name for f in VisionCheck._meta.get_fields()}
