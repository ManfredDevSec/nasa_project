"""T11: crew overview + weekly report (docs/03 R4–R5, docs/06 T11 "Done when", docs/05 §9)."""
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase

from accounts.tests import AuthTestBase
from core.test_seed import FAST
from crew.models import Astronaut
from missions.models import Mission
from vitals.models import DailyLog

from .services import cabin_level


@FAST
class SeededOverviewTests(AuthTestBase):
    def setUp(self):
        super().setUp()
        call_command("seed_mission", "--reset", stdout=StringIO())
        self.ares = Mission.objects.get(is_active=True)

    def as_user(self, username):
        self.client.credentials()
        self.auth(self.login(username, "sightline-demo").json()["token"])

    def overview(self, **params):
        return self.client.get("/api/v1/crew/overview/", params)

    def test_osei_red_with_alert(self):
        self.as_user("adjei")  # Medical Officer
        o = self.overview().json()
        self.assertEqual(o["mission_day"], 92)
        crew = {r["call_sign"]: r for r in o["crew"]}
        self.assertEqual((crew["Osei"]["eyes"], crew["Osei"]["overall"]), ("RED", "RED"))
        self.assertEqual(o["crew"][0]["call_sign"], "Osei")  # worst first
        self.assertEqual(o["alerts"][0]["text"], "Osei: escalate to Earth")
        self.assertEqual(o["alerts"][0]["level"], "RED")
        self.assertEqual(o["alerts"][0]["astronaut_id"], Astronaut.objects.get(call_sign="Osei").pk)
        self.assertEqual(o["alerts"][0]["call_sign"], "Osei")
        self.assertEqual(crew["Osei"]["name"], "Ama Osei")
        self.assertTrue(any(i.startswith("Osei: This change followed") for i in o["insights"]))
        self.assertFalse(any(i.startswith("Mensah:") for i in o["insights"]))  # GREEN → no insights

    def test_spec_05_overview_check(self):
        """docs/05 §9: Osei RED, Mensah GREEN, Adjei GREEN."""
        self.as_user("surgeon")
        crew = {r["call_sign"]: r["overall"] for r in self.overview().json()["crew"]}
        self.assertEqual((crew["Osei"], crew["Mensah"], crew["Adjei"]), ("RED", "GREEN", "GREEN"))
        self.assertEqual(len(crew), 6)

    def test_overview_shape(self):
        self.as_user("surgeon")
        o = self.overview().json()
        self.assertEqual(set(o["cabin"]), {"co2_mmhg_today", "co2_level", "co2_5day_avg"})
        row = o["crew"][0]
        self.assertTrue({"astronaut_id", "call_sign", "eyes", "heart", "sleep", "mind", "overall", "headline", "overdue"} <= set(row))
        self.assertTrue({"astronaut_id", "call_sign", "level", "text", "created_at"} <= set(o["alerts"][0]))
        self.assertIsInstance(o["insights"], list)

    def test_weekly_report_today(self):
        self.as_user("surgeon")
        w = self.client.get("/api/v1/reports/weekly/").json()
        self.assertEqual(w["mission"]["day_range"], [86, 92])
        env = w["environment"]
        self.assertIsInstance(env["co2_avg"], float)
        self.assertIsInstance(env["co2_max"], float)
        self.assertGreaterEqual(env["days_above_normal"], 3)  # days 86–88 (docs/05 §5)
        self.assertTrue(any(i.startswith("Osei: This change followed") and "CO₂" in i for i in w["insights"]))
        osei = next(c for c in w["crew_summary"] if c["call_sign"] == "Osei")
        self.assertEqual((osei["eyes"], osei["new_amsler"], osei["escalated"], osei["symptom_score"]), ("RED", ["LEFT"], True, 5))
        self.assertEqual(osei["near_drift"], {"left": 2.0, "right": 0.33})
        self.assertEqual(w["recommendations_for_surgeon"][0], "Review Osei's left-eye trend and Amsler grid.")

    def test_weekly_report_earlier_week_keeps_the_worst_result(self):
        self.as_user("adjei")
        day_44 = (self.ares.start_date + timedelta(days=43)).isoformat()  # week 38–44: Adjei AMBER on 42, GREEN on 44
        w = self.client.get("/api/v1/reports/weekly/", {"week_ending": day_44}).json()
        adjei = next(c for c in w["crew_summary"] if c["call_sign"] == "Adjei")
        self.assertEqual((adjei["eyes"], adjei["tests"]), ("AMBER", 2))
        self.assertIn("Follow up on Adjei's 48-hour retest.", w["recommendations_for_surgeon"])

    def test_roles(self):
        for username, code in [("osei", 403), ("adjei", 200), ("surgeon", 200)]:
            self.as_user(username)
            self.assertEqual(self.overview().status_code, code, username)
            self.assertEqual(self.client.get("/api/v1/reports/weekly/").status_code, code, username)

    def test_other_missions(self):
        gateway = Mission.objects.get(name="Gateway Station 9")
        self.as_user("surgeon")  # may pick any mission
        o = self.overview(mission=gateway.pk).json()
        self.assertEqual((o["mission"]["name"], o["mission_day"]), ("Gateway Station 9", 180))  # finished: last day
        w = self.client.get("/api/v1/reports/weekly/", {"mission": gateway.pk, "week_ending": (gateway.start_date + timedelta(days=155)).isoformat()}).json()
        bonsu = next(c for c in w["crew_summary"] if c["call_sign"] == "Bonsu")
        self.assertEqual((bonsu["eyes"], bonsu["new_amsler"]), ("RED", ["RIGHT"]))
        self.as_user("adjei")  # an MO only sees their own mission
        self.assertErrorCode(self.overview(mission=gateway.pk), 403, "PERMISSION_DENIED")
        self.assertErrorCode(self.overview(mission=99999), 404, "NOT_FOUND")


@FAST
class AlertRulesTests(AuthTestBase):
    def setUp(self):
        super().setUp()
        self.auth(self.login("surgeon").json()["token"])

    def test_vitals_red_and_overdue_alerts(self):
        osei = self.astronauts["osei"]
        from django.utils import timezone

        DailyLog.objects.create(astronaut=osei, date=timezone.localdate(), systolic_mmhg=150, diastolic_mmhg=95, resting_hr_bpm=70)
        alerts = self.client.get("/api/v1/crew/overview/").json()["alerts"]
        texts = [a["text"] for a in alerts]
        self.assertIn("Osei: heart needs attention", texts)
        self.assertIn("Osei: eye test overdue", texts)  # no test since the mission started (2026-08-15)
        self.assertEqual(alerts[0]["level"], "RED")

    def test_no_problems_week(self):
        w = self.client.get("/api/v1/reports/weekly/").json()
        self.assertTrue(all(c["eyes"] == "UNKNOWN" for c in w["crew_summary"]))
        self.assertIn("did no eye test this week", w["recommendations_for_surgeon"][0])


class CabinLevelTests(SimpleTestCase):
    def test_bands(self):
        for co2, level in [(None, "UNKNOWN"), ("2.5", "GREEN"), ("3.5", "GREEN"), ("3.51", "AMBER"),
                           ("4.1", "AMBER"), ("5.0", "AMBER"), ("5.01", "RED")]:
            with self.subTest(co2=co2):
                self.assertEqual(cabin_level(Decimal(co2) if co2 else None), level)
