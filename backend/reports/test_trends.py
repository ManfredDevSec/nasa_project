"""T10: trends + engagement (docs/03 R2–R3, docs/04 §6, docs/06 T10 "Done when", docs/05 §9)."""
from datetime import date, timedelta
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase
from django.utils import timezone

from accounts.tests import AuthTestBase
from core.test_seed import FAST
from crew.models import Astronaut
from scoring import config

from .services import streak_weeks


@FAST
class SeededTrendsTests(AuthTestBase):
    def setUp(self):
        super().setUp()
        call_command("seed_mission", "--reset", stdout=StringIO())
        self.osei = Astronaut.objects.get(user__username="osei")
        self.client.credentials()
        self.auth(self.login("osei", "sightline-demo").json()["token"])

    def test_arrays_line_up_by_mission_day(self):
        t = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/trends/").json()
        for series in ("vision", "cabin_co2", "daily"):
            days = [p["mission_day"] for p in t[series]]
            self.assertEqual(days, sorted(set(days)), series)  # ascending, one point per day
        start = self.osei.mission.start_date
        for series in ("vision", "cabin_co2", "daily"):  # date and mission_day agree everywhere
            for p in t[series]:
                self.assertEqual(date.fromisoformat(p["date"]), start + timedelta(days=p["mission_day"] - 1))
        self.assertEqual(t["baseline"]["near_vision_right"], 8.33)

    def test_co2_high_start_at_day_78_lines_up_with_vision_drop(self):
        t = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/trends/").json()
        self.assertIn({"mission_day": 78, "type": "CO2_HIGH_START", "text": "Cabin CO₂ above normal"}, t["events"])
        co2 = {p["mission_day"]: p["co2_mmhg"] for p in t["cabin_co2"]}
        self.assertTrue(all(co2[d] > config.CO2_HIGH_MMHG for d in range(78, 89)))  # bump days 78–88
        vision = {p["mission_day"]: p["level"] for p in t["vision"]}
        self.assertEqual((vision[77], vision[84], vision[91]), ("GREEN", "AMBER", "RED"))  # drop inside the bump
        self.assertIn(91, [e["mission_day"] for e in t["events"] if e["type"] == "ESCALATED"])

    def test_engagement_matches_spec_05(self):
        e = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/engagement/").json()
        self.assertGreaterEqual(e["streak_weeks"], 12)
        earned = {b["code"] for b in e["badges"] if b["earned"]}
        self.assertTrue({"FIRST_TEST", "STREAK_4", "STREAK_12"} <= earned)
        self.assertEqual(e["mission_progress"], {"day": 92, "planned": 900, "pct": 10.2})
        self.assertEqual(e["tests_completed"], 14)
        self.assertFalse(e["overdue"])
        self.assertEqual([b["name"] for b in e["badges"]], ["First Look", "Steady Eyes (4 weeks)",
                         "Clear Orbit (12 weeks)", "30 Daily Logs", "Reported symptoms early"])

    def test_days_window_and_as_of(self):
        url = f"/api/v1/astronauts/{self.osei.pk}/trends/"
        t = self.client.get(url, {"days": 14}).json()
        self.assertEqual([p["mission_day"] for p in t["vision"]], [84, 86, 91])
        self.assertEqual(t["period"]["days"], 14)
        day_80 = (self.osei.mission.start_date + timedelta(days=79)).isoformat()
        t = self.client.get(url, {"as_of": day_80, "days": 10}).json()
        self.assertEqual([e["type"] for e in t["events"]], ["CO2_HIGH_START"])
        self.assertEqual(t["cabin_co2"][-1]["mission_day"], 80)
        for bad in ({"days": 0}, {"days": 5000}, {"as_of": "nope"}):
            self.assertErrorCode(self.client.get(url, bad), 400, "VALIDATION_ERROR")

    def test_engagement_as_of_early_in_the_mission(self):
        day_20 = (self.osei.mission.start_date + timedelta(days=19)).isoformat()
        e = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/engagement/", {"as_of": day_20}).json()
        self.assertEqual((e["streak_weeks"], e["tests_completed"]), (2, 2))  # days 7 and 14
        earned = {b["code"] for b in e["badges"] if b["earned"]}
        self.assertEqual(earned, {"FIRST_TEST"})

    def test_finished_mission_reports_its_last_day(self):
        bonsu = Astronaut.objects.get(user__username="bonsu")
        self.client.credentials()
        self.auth(self.login("bonsu", "sightline-demo").json()["token"])
        e = self.client.get(f"/api/v1/astronauts/{bonsu.pk}/engagement/").json()
        self.assertEqual(e["mission_progress"]["pct"], 100.0)
        self.assertGreaterEqual(e["streak_weeks"], 12)
        t = self.client.get(f"/api/v1/astronauts/{bonsu.pk}/trends/").json()
        self.assertTrue(t["vision"])  # not empty, although the mission ended long ago
        self.assertIn(154, [x["mission_day"] for x in t["events"] if x["type"] == "ESCALATED"])

    def test_permissions(self):
        mensah = Astronaut.objects.get(user__username="mensah")
        for path in ("trends", "engagement"):
            r = self.client.get(f"/api/v1/astronauts/{mensah.pk}/{path}/")
            self.assertErrorCode(r, 403, "PERMISSION_DENIED")


@FAST
class EmptyTrendsTests(AuthTestBase):
    def test_new_astronaut(self):
        osei = self.astronauts["osei"]
        self.auth(self.login("osei").json()["token"])
        t = self.client.get(f"/api/v1/astronauts/{osei.pk}/trends/").json()
        self.assertEqual((t["baseline"], t["vision"], t["daily"], t["events"]), (None, [], [], []))
        e = self.client.get(f"/api/v1/astronauts/{osei.pk}/engagement/").json()
        self.assertEqual((e["streak_weeks"], e["tests_completed"]), (0, 0))
        # no assessment yet → mission start + interval
        self.assertEqual(e["next_test_due"], (osei.mission.start_date + timedelta(days=7)).isoformat())
        self.assertTrue(e["overdue"] == (timezone.localdate() > osei.mission.start_date + timedelta(days=7)))


class StreakRuleTests(SimpleTestCase):
    def test_streak(self):
        today = date(2026, 11, 14)
        weekly = [today - timedelta(days=7 * i + 1) for i in range(5)]  # one test in each of the last 5 weeks
        self.assertEqual(streak_weeks(weekly, today), 5)
        self.assertEqual(streak_weeks(weekly[:2] + weekly[3:], today), 2)  # a missed week breaks it
        self.assertEqual(streak_weeks([], today), 0)
        self.assertEqual(streak_weeks([today - timedelta(days=7)], today), 0)  # window 1 = today and 6 days before
