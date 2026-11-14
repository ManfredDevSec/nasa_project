"""T9: body map (docs/03 R1, docs/06 T9 "Done when")."""
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.tests import AuthTestBase
from core.test_seed import FAST
from crew.models import Astronaut
from vitals.models import DailyLog

from .content import PART_CONTENT


def parts(body):
    return {p["part"]: p for p in body["parts"]}


@FAST
class BodyMapDoneWhenTests(AuthTestBase):
    """Against the seeded demo story (docs/05)."""

    def setUp(self):
        super().setUp()
        call_command("seed_mission", "--reset", stdout=StringIO())
        self.osei = Astronaut.objects.get(user__username="osei")
        self.adjei = Astronaut.objects.get(user__username="adjei")

    def get(self, astronaut, username="surgeon", **params):
        # (not "admin": the test base already made an admin superuser, which the seed rightly leaves alone)
        self.client.credentials()
        self.auth(self.login(username, "sightline-demo").json()["token"])
        return self.client.get(f"/api/v1/astronauts/{astronaut.pk}/body-map/", params)

    def test_osei_eyes_red_heart_green(self):
        r = self.get(self.osei, "osei")
        self.assertEqual(r.status_code, 200, r.content)
        p = parts(r.json())
        self.assertEqual((p["EYES"]["level"], p["HEART"]["level"]), ("RED", "GREEN"))
        self.assertEqual(r.json()["mission_day"], 92)
        self.assertTrue(p["EYES"]["summary"].startswith("Left eye near vision is 2 lines below your normal."))
        self.assertEqual(p["EYES"]["guidance"], "Tell the Crew Medical Officer now.")

    def test_adjei_day_45_sleep_amber(self):
        day_45 = self.adjei.mission.start_date + timedelta(days=44)
        p = parts(self.get(self.adjei, "adjei", as_of=day_45.isoformat()).json())
        self.assertEqual(p["SLEEP"]["level"], "AMBER")
        self.assertEqual(p["MIND"]["level"], "AMBER")  # mood 3 on days 40–48
        self.assertEqual(parts(self.get(self.adjei, "adjei").json())["SLEEP"]["level"], "GREEN")  # recovered by today

    def test_as_of_before_first_test_is_unknown_eyes(self):
        day_3 = self.osei.mission.start_date + timedelta(days=2)
        self.assertEqual(parts(self.get(self.osei, as_of=day_3.isoformat()).json())["EYES"]["level"], "UNKNOWN")

    def test_crew_only_own_body_map(self):
        self.assertEqual(self.get(self.adjei, "osei").status_code, 403)
        self.assertEqual(self.get(self.osei, "adjei").status_code, 200)    # MO: whole crew
        self.assertEqual(self.get(self.osei, "surgeon").status_code, 200)  # read-only, still may view


@FAST
class BodyMapRulesTests(AuthTestBase):
    """Small hand-made cases for each rule."""

    def setUp(self):
        super().setUp()
        self.osei = self.astronauts["osei"]
        self.today = timezone.localdate()
        self.auth(self.login("osei").json()["token"])

    def body(self):
        return parts(self.client.get(f"/api/v1/astronauts/{self.osei.pk}/body-map/").json())

    def log(self, days_ago, **values):
        DailyLog.objects.create(astronaut=self.osei, date=self.today - timedelta(days=days_ago), **values)

    def test_no_data_is_unknown_with_static_info(self):
        p = self.body()
        self.assertEqual({k: v["level"] for k, v in p.items()},
                         {"EYES": "UNKNOWN", "HEART": "UNKNOWN", "SLEEP": "UNKNOWN", "MIND": "UNKNOWN"})
        self.assertEqual(p["EYES"]["summary"], "No eye test yet. Take your first test.")
        self.assertIsNone(p["EYES"]["last_updated"])
        for part, content in PART_CONTENT.items():
            self.assertEqual((p[part]["info"], p[part]["action"]), (content["info"], content["action"]))
            self.assertEqual(p[part]["read_more_url"], content["read_more_url"])

    def test_heart_is_worse_of_rate_and_pressure(self):
        self.log(0, resting_hr_bpm=64, systolic_mmhg=142, diastolic_mmhg=80)
        heart = self.body()["HEART"]
        self.assertEqual((heart["level"], heart["summary"]), ("RED", "HR 64, BP 142/80"))
        self.assertIn("Blood pressure 142/80 is high", heart["guidance"])

    def test_each_part_uses_the_latest_log_that_has_it(self):
        self.log(3, sleep_hours=Decimal("6.0"), mood=2)
        self.log(0, mood=5)  # today: only mood
        p = self.body()
        self.assertEqual((p["MIND"]["level"], p["MIND"]["summary"]), ("GREEN", "Mood 5/5"))
        self.assertEqual(p["SLEEP"]["level"], "AMBER")
        day = self.today - timedelta(days=3)
        self.assertEqual(p["SLEEP"]["summary"], f"6.0 h on {day.day} {day:%b}")

    def test_last_night_wording(self):
        self.log(1, sleep_hours=Decimal("7.5"))
        self.assertEqual(self.body()["SLEEP"]["summary"], "7.5 h last night")

    def test_bad_as_of(self):
        r = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/body-map/", {"as_of": "yesterday"})
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
