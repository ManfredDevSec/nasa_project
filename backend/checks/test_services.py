"""T6: submit_check + Baseline recompute (docs/02 §4, docs/06 T6 "Done when")."""
from datetime import date, datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings

from crew.models import Astronaut, Baseline
from missions.models import CabinLog
from missions.tests import make_mission
from scoring.exceptions import NoBaselineError
from scoring.models import Assessment
from vitals.models import DailyLog

from .models import VisionCheck
from .services import recompute_baseline, submit_check

START = date(2026, 8, 15)  # mission day 1


def at(day, hour=9):
    """A taken_at on mission day `day` (pre-flight days are <= 0)."""
    return datetime.combine(START + timedelta(days=day - 1), datetime.min.time(), tzinfo=dt_timezone.utc) + timedelta(hours=hour)


def scores(near=(8, 8), contrast=(6, 6), amsler=([], []), symptoms=(0, 0, 0)):
    return dict(
        near_vision_left=near[0], near_vision_right=near[1], contrast_left=contrast[0], contrast_right=contrast[1],
        amsler_left=amsler[0], amsler_right=amsler[1],
        headache=symptoms[0], eye_pressure=symptoms[1], blur=symptoms[2],
    )


class SubmitCheckTests(TestCase):
    def setUp(self):
        self.mission = make_mission(start_date=START)
        self.osei = Astronaut.objects.create(mission=self.mission, full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER")

    def baselines(self, astronaut=None, rights=(8, 9, 8)):
        """Osei's pre-flight checks (docs/05 §4): days -30/-20/-10, near R 8, 9, 8."""
        for day, right in zip((-30, -20, -10), rights):
            submit_check({"astronaut": astronaut or self.osei, "is_baseline": True, "taken_at": at(day),
                          **scores(near=(8, right))})

    def submit(self, day, **kw):
        return submit_check({"astronaut": self.osei, "taken_at": at(day), **scores(**kw)})

    # --- Done when (1): baseline checks -> Baseline exists -------------------
    def test_baseline_checks_build_the_baseline(self):
        check, assessment, baseline = submit_check(
            {"astronaut": self.osei, "is_baseline": True, "taken_at": at(-30), **scores()})
        self.assertIsNone(assessment)
        self.assertEqual((baseline.near_vision_left, baseline.checks_used), (Decimal("8.00"), 1))
        self.assertEqual(check.mission_day, -30)  # docs/05 §4: baseline days -30, -20, -10

        self.baselines()
        b = Baseline.objects.get(astronaut=self.osei)
        self.assertEqual(b.checks_used, 4)
        # 8, 8, 9, 8 → 8.25 on the right
        self.assertEqual((b.near_vision_left, b.near_vision_right, b.contrast_left), (Decimal("8.00"), Decimal("8.25"), Decimal("6.00")))

    def test_spec_baseline_average_8_33(self):
        self.baselines()
        self.assertEqual(Baseline.objects.get(astronaut=self.osei).near_vision_right, Decimal("8.33"))

    # --- Done when (2): scored check -> Assessment saved with reasons/actions --
    def test_scored_check_saves_assessment(self):
        self.baselines()
        check, assessment, baseline = self.submit(84, near=(7, 8), symptoms=(1, 1, 1))
        self.assertIsNone(baseline)
        self.assertEqual(Assessment.objects.get(), assessment)
        self.assertEqual((assessment.vision_check, assessment.astronaut), (check, self.osei))
        self.assertEqual(assessment.level, "AMBER")
        self.assertIn("Left eye near vision is 1 line below your normal.", assessment.reasons)
        self.assertEqual([a["code"] for a in assessment.actions][:2], ["RETEST_48H", "NOTIFY_MO"])
        self.assertEqual(assessment.next_test_due, date(2026, 11, 8))  # day 84 + 2 days

    def test_no_baseline_is_409_and_saves_nothing(self):
        with self.assertRaises(NoBaselineError):
            self.submit(7)
        self.assertFalse(VisionCheck.objects.exists())

    def test_invalid_values_save_nothing(self):
        self.baselines()
        with self.assertRaises(ValidationError):
            self.submit(7, near=(11, 8))
        with self.assertRaises(ValidationError):
            self.submit(7, amsler=([[10, 2]], []))
        self.assertEqual(VisionCheck.objects.filter(is_baseline=False).count(), 0)

    # --- Context loading -------------------------------------------------------
    def test_previous_checks_follow_test_time_not_save_order(self):
        """Seed inserts history; 'previous' must mean earlier taken_at."""
        self.baselines()
        # Saved out of order: day 77 is saved after day 84.
        self.submit(70)
        _, day84, _ = self.submit(84, near=(7, 8))
        self.submit(77)
        _, day91, _ = self.submit(91, near=(7, 8))
        # day 91 sees 70 (8), 77 (8), 84 (7) + now 7 → steady decline
        self.assertIn("Left eye vision has dropped over your last 4 tests.", day91.reasons)
        # day 84 only saw day 70 when it was scored
        self.assertFalse(any("dropped" in r for r in day84.reasons))

    def test_new_amsler_compared_with_previous_scored_check_not_baseline(self):
        self.baselines()
        self.submit(84)
        _, a, _ = self.submit(91, amsler=([[3, 4], [3, 5], [4, 4]], []))
        self.assertTrue(a.new_amsler_left)
        self.assertEqual(a.level, "RED")
        _, again, _ = self.submit(92, amsler=([[3, 4]], []))
        self.assertFalse(again.new_amsler_left)  # day 91 already had marks
        self.assertEqual(again.level, "AMBER")

    def test_cabin_co2_and_daily_logs_feed_insights(self):
        self.baselines()
        for day in range(77, 91):  # CO₂ high from day 78 (docs/05 §5)
            CabinLog.objects.create(mission=self.mission, date=START + timedelta(days=day - 1),
                                    co2_mmhg=Decimal("4.6") if day >= 78 else Decimal("2.5"))
            DailyLog.objects.create(astronaut=self.osei, date=START + timedelta(days=day - 1), sodium_mg=3900, exercise_min=55)
        _, a, _ = self.submit(84, near=(7, 8))
        self.assertEqual([i["factor"] for i in a.env_insights], ["CO2", "SODIUM", "EXERCISE"])
        self.assertIn("This change followed 6 days of high cabin CO₂.", a.env_insights[0]["text"])  # days 78–83
        self.assertIn("CHECK_CO2", [x["code"] for x in a.actions])

    def test_other_astronauts_dont_count(self):
        mensah = Astronaut.objects.create(mission=self.mission, full_name="Kofi Mensah", call_sign="Mensah", crew_role="PILOT")
        self.baselines()
        self.baselines(astronaut=mensah, rights=(9, 9, 9))
        submit_check({"astronaut": mensah, "taken_at": at(84), **scores(amsler=([[1, 1]], []))})
        _, a, _ = self.submit(91, amsler=([[3, 4]], []))
        self.assertTrue(a.new_amsler_left)  # Mensah's marks are not Osei's "previous check"

    def test_mars_gravity_is_used(self):
        self.mission.gravity_g = Decimal("0.38")
        self.mission.save()
        self.baselines(rights=(8, 8, 8))
        _, a, _ = self.submit(10, near=(7, 8))
        self.assertEqual(a.level, "GREEN")  # docs/04 case 13

    def test_routine_interval_from_astronaut(self):
        self.osei.test_interval_days = 10
        self.osei.save()
        self.baselines()
        _, a, _ = self.submit(7)
        self.assertEqual(a.next_test_due, (at(7) + timedelta(days=10)).date())

    def test_recompute_after_deleting_baseline_checks(self):
        self.baselines()
        VisionCheck.objects.filter(is_baseline=True).delete()
        self.assertIsNone(recompute_baseline(self.osei))
        self.assertFalse(Baseline.objects.exists())


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class AdminGoesThroughServiceTests(TestCase):
    URL = "/admin/checks/visioncheck/add/"

    def setUp(self):
        self.osei = Astronaut.objects.create(mission=make_mission(start_date=START), full_name="Ama Osei",
                                             call_sign="Osei", crew_role="COMMANDER")
        self.client.force_login(get_user_model().objects.create_superuser("adm", "", "x-long-pass-123"))

    def post(self, **overrides):
        data = {"astronaut": self.osei.pk, "taken_at_0": "2026-11-14", "taken_at_1": "09:30:00",
                "near_vision_left": "6", "near_vision_right": "8", "contrast_left": "5", "contrast_right": "6",
                "amsler_left": "[]", "amsler_right": "[]", "headache": "0", "eye_pressure": "0", "blur": "0",
                "distance_ok": "unknown", "notes": "",
                "assessment-TOTAL_FORMS": "0", "assessment-INITIAL_FORMS": "0",
                "assessment-MIN_NUM_FORMS": "0", "assessment-MAX_NUM_FORMS": "1", **overrides}
        return self.client.post(self.URL, data, follow=True)

    def test_scored_check_without_baseline_shows_form_error(self):
        r = self.post()
        self.assertContains(r, "has no baseline yet")
        self.assertFalse(VisionCheck.objects.exists())

    def test_baseline_then_scored_check(self):
        r = self.post(is_baseline="on", near_vision_left="8")
        self.assertContains(r, "Baseline updated from 1 baseline check")
        r = self.post()  # 6/8 vs baseline 8 → drift 2 → RED
        self.assertContains(r, "Scored RED")
        self.assertEqual(Assessment.objects.get().level, "RED")

    def test_saved_checks_are_view_only_and_delete_recomputes(self):
        self.post(is_baseline="on", near_vision_left="8")
        self.post(is_baseline="on", near_vision_left="6")
        self.assertEqual(Baseline.objects.get().near_vision_left, Decimal("7.00"))
        first = VisionCheck.objects.order_by("pk").first()
        page = self.client.get(f"/admin/checks/visioncheck/{first.pk}/change/")
        self.assertNotContains(page, 'name="_save"')  # view only
        self.client.post(f"/admin/checks/visioncheck/{first.pk}/delete/", {"post": "yes"})
        self.assertEqual(Baseline.objects.get().near_vision_left, Decimal("6.00"))
