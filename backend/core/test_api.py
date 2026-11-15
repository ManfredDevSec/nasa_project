"""T7: core endpoints (docs/03 M1, C1–C3, V1–V3, D1–D2, E1–E2) against the contract.

Uses the T2 test world: one active mission (start 2026-08-15) with Osei (CREW), Mensah (CREW),
Adjei (MEDICAL_OFFICER), a surgeon (FLIGHT_SURGEON), an admin, and 'Far' on another mission.
"""
from datetime import date, datetime, timedelta, timezone as dt_timezone
from unittest import mock

from accounts.tests import AuthTestBase
from checks.models import VisionCheck
from checks.services import submit_check
from missions.models import CabinLog, Mission
from vitals.models import DailyLog

START = date(2026, 8, 15)
TODAY = date(2026, 11, 14)  # mission day 92


def at(day):
    return datetime.combine(START + timedelta(days=day - 1), datetime.min.time(), tzinfo=dt_timezone.utc) + timedelta(hours=9)


def scores(near=(8, 8), contrast=(6, 6), amsler=([], []), symptoms=(0, 0, 0)):
    return dict(near_vision_left=near[0], near_vision_right=near[1], contrast_left=contrast[0],
                contrast_right=contrast[1], amsler_left=amsler[0], amsler_right=amsler[1],
                headache=symptoms[0], eye_pressure=symptoms[1], blur=symptoms[2])


class ApiTestBase(AuthTestBase):
    def setUp(self):
        super().setUp()
        self.mission = Mission.objects.get(is_active=True)
        self.osei, self.mensah, self.adjei, self.far = (self.astronauts[k] for k in ("osei", "mensah", "adjei", "stranger"))
        # Freeze "today" where it's used: modules that did `from core.api import today` hold their own reference.
        for target in ("core.api.today", "missions.serializers.today"):
            patcher = mock.patch(target, return_value=TODAY)
            patcher.start()
            self.addCleanup(patcher.stop)

    def as_user(self, username):
        self.client.credentials()
        self.auth(self.login(username).json()["token"])

    def baselines(self, astronaut):
        for day, right in zip((-30, -20, -10), (8, 9, 8)):
            submit_check({"astronaut": astronaut, "is_baseline": True, "taken_at": at(day), **scores(near=(8, right))})

    def scored(self, astronaut, day, **kw):
        return submit_check({"astronaut": astronaut, "taken_at": at(day), **scores(**kw)})


class MissionApiTests(ApiTestBase):
    def test_m1_active_mission(self):
        self.as_user("osei")
        r = self.client.get("/api/v1/missions/active/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"id": self.mission.pk, "name": "Ares Transit 1", "environment": "TRANSIT",
                                    "gravity_g": 0.0, "start_date": "2026-08-15", "mission_day_today": 92,
                                    "planned_duration_days": 900})

    def test_m1_needs_login(self):
        self.assertErrorCode(self.client.get("/api/v1/missions/active/"), 401, "NOT_AUTHENTICATED")

    def test_m1_no_active_mission(self):
        Mission.objects.update(is_active=False)
        self.as_user("osei")
        self.assertErrorCode(self.client.get("/api/v1/missions/active/"), 409, "NO_ACTIVE_MISSION")


class CabinLogApiTests(ApiTestBase):
    URL = "/api/v1/cabin-logs/"

    def test_e1_upsert(self):
        self.as_user("adjei")  # Medical Officer
        r = self.client.post(self.URL, {"date": "2026-11-14", "co2_mmhg": 4.6, "temperature_c": 22.5, "humidity_pct": 45}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["mission_day"], 92)
        self.assertEqual((r.json()["mission"], r.json()["co2_mmhg"]), (self.mission.pk, 4.6))  # number, not "4.60"
        r = self.client.post(self.URL, {"date": "2026-11-14", "co2_mmhg": 3.1}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["co2_mmhg"], r.json()["temperature_c"]), (3.1, 22.5))  # temperature kept
        self.assertEqual(CabinLog.objects.count(), 1)

    def test_e1_roles(self):
        for username, code in [("osei", 403), ("surgeon", 403), ("admin", 201)]:
            self.as_user(username)
            r = self.client.post(self.URL, {"date": "2026-11-13", "co2_mmhg": 2.5}, format="json")
            self.assertEqual(r.status_code, code, username)

    def test_e1_validation(self):
        self.as_user("adjei")
        r = self.client.post(self.URL, {"date": "2026-11-14", "co2_mmhg": 16}, format="json")
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertEqual(r.json()["error"]["details"]["co2_mmhg"], ["Must be between 0 and 15."])
        r = self.client.post(self.URL, {"co2_mmhg": 3}, format="json")
        self.assertIn("date", r.json()["error"]["details"])

    def test_e2_history_any_role(self):
        for d in (1, 2, 3):
            CabinLog.objects.create(mission=self.mission, date=START + timedelta(days=d - 1), co2_mmhg=2.5)
        self.as_user("osei")
        r = self.client.get(self.URL, {"from": "2026-08-16"})
        self.assertEqual([x["mission_day"] for x in r.json()], [2, 3])
        self.assertErrorCode(self.client.get(self.URL, {"from": "2026-09-01", "to": "2026-08-01"}), 400, "VALIDATION_ERROR")


class CrewApiTests(ApiTestBase):
    def test_c1_crew_sees_colours_but_only_own_details(self):
        self.baselines(self.osei)
        self.baselines(self.mensah)
        self.scored(self.osei, 91, near=(6, 8))
        self.scored(self.mensah, 91)
        self.as_user("osei")
        crew = {a["call_sign"]: a for a in self.client.get("/api/v1/astronauts/").json()}
        self.assertEqual(set(crew), {"Osei", "Mensah", "Adjei"})  # not the other mission
        self.assertEqual(crew["Osei"]["latest_status"], {
            "level": "RED", "mission_day": 91, "headline": "Left eye near vision is 2 lines below your normal.",
            "next_test_due": "2026-11-15"})
        self.assertEqual(crew["Mensah"]["latest_status"],
                         {"level": "GREEN", "mission_day": 91, "headline": None, "next_test_due": None})
        self.assertIsNone(crew["Adjei"]["latest_status"])  # no scored check yet
        self.assertEqual(set(crew["Osei"]), {"id", "full_name", "call_sign", "crew_role", "is_medical_officer", "latest_status"})

    def test_c1_medical_officer_and_surgeon_see_details(self):
        self.baselines(self.mensah)
        self.scored(self.mensah, 91)
        for username in ("adjei", "surgeon"):
            self.as_user(username)
            crew = {a["call_sign"]: a for a in self.client.get("/api/v1/astronauts/").json()}
            self.assertIsNotNone(crew["Mensah"]["latest_status"]["headline"], username)

    def test_c2_permissions(self):
        cases = [("osei", self.osei, 200), ("osei", self.mensah, 403), ("adjei", self.osei, 200),
                 ("adjei", self.far, 403), ("surgeon", self.far, 200), ("admin", self.mensah, 200)]
        for username, astronaut, code in cases:
            self.as_user(username)
            r = self.client.get(f"/api/v1/astronauts/{astronaut.pk}/")
            self.assertEqual(r.status_code, code, f"{username} → {astronaut.call_sign}")
            if code == 403:
                self.assertEqual(r.json()["error"]["code"], "PERMISSION_DENIED")
        self.assertErrorCode(self.client.get("/api/v1/astronauts/99999/"), 404, "NOT_FOUND")

    def test_c2_detail_fields(self):
        self.as_user("osei")
        body = self.client.get(f"/api/v1/astronauts/{self.osei.pk}/").json()
        self.assertEqual((body["display_name"], body["mission"], body["test_interval_days"]),
                         ("Cmdr. Ama Osei", self.mission.pk, 7))

    def test_c3_baseline(self):
        self.as_user("osei")
        url = f"/api/v1/astronauts/{self.osei.pk}/baseline/"
        self.assertErrorCode(self.client.get(url), 404, "NO_BASELINE")
        self.baselines(self.osei)
        body = self.client.get(url).json()
        self.assertEqual({k: body[k] for k in ("near_vision_left", "near_vision_right", "contrast_left", "checks_used")},
                         {"near_vision_left": 8.0, "near_vision_right": 8.33, "contrast_left": 6.0, "checks_used": 3})
        self.assertErrorCode(self.client.get(f"/api/v1/astronauts/{self.mensah.pk}/baseline/"), 403, "PERMISSION_DENIED")


class CheckApiTests(ApiTestBase):
    URL = "/api/v1/checks/"

    def post(self, astronaut, **fields):
        body = {"astronaut": astronaut.pk, "taken_at": "2026-11-14T09:30:00Z", **scores(), **fields}
        return self.client.post(self.URL, body, format="json")

    def test_v1_baseline_then_scored(self):
        self.as_user("osei")
        r = self.post(self.osei, is_baseline=True, taken_at="2026-07-16T09:00:00Z")
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertIsNone(body["assessment"])
        self.assertEqual((body["baseline"]["checks_used"], body["check"]["mission_day"]), (1, -29))

        # docs/03 V1 example request
        r = self.post(self.osei, is_baseline=False, near_vision_left=6, contrast_left=5,
                      amsler_left=[[3, 4], [3, 5]], headache=2, eye_pressure=1, blur=2, distance_ok=True, notes="")
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertIsNone(body["baseline"])
        self.assertEqual(body["check"]["mission_day"], 92)
        a = body["assessment"]
        self.assertEqual(set(a) - {"id"}, {
            "level", "worse_eye", "near_drift_left", "near_drift_right", "contrast_drift_left", "contrast_drift_right",
            "symptom_score", "new_amsler_left", "new_amsler_right", "reasons", "actions", "env_insights",
            "escalate_to_earth", "next_test_due"})
        self.assertEqual((a["level"], a["worse_eye"], a["near_drift_left"], a["symptom_score"]), ("RED", "LEFT", 2.0, 5))
        self.assertTrue(a["escalate_to_earth"])
        self.assertEqual(a["next_test_due"], "2026-11-16")

    def test_v1_crew_cannot_submit_for_someone_else(self):
        self.baselines(self.mensah)
        self.as_user("osei")
        self.assertErrorCode(self.post(self.mensah), 403, "PERMISSION_DENIED")
        self.as_user("surgeon")
        self.assertErrorCode(self.post(self.mensah), 403, "PERMISSION_DENIED")
        self.assertFalse(VisionCheck.objects.filter(is_baseline=False).exists())
        self.as_user("adjei")  # Medical Officer may, for the crew
        self.assertEqual(self.post(self.mensah).status_code, 201)

    def test_v1_no_baseline_and_validation(self):
        self.as_user("osei")
        self.assertErrorCode(self.post(self.osei), 409, "NO_BASELINE")
        r = self.post(self.osei, near_vision_left=11, amsler_left=[[10, 2]])
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        details = r.json()["error"]["details"]
        self.assertEqual(details["near_vision_left"], ["Must be between 1 and 10."])
        self.assertIn("amsler_left", details)

    def test_v2_history(self):
        self.baselines(self.osei)
        self.baselines(self.mensah)
        for day in (84, 7, 91):  # saved out of order
            self.scored(self.osei, day)
        self.scored(self.mensah, 7)
        self.as_user("osei")
        days = lambda r: [p["check"]["mission_day"] for p in r.json()]  # noqa: E731
        self.assertEqual(days(self.client.get(self.URL)), [7, 84, 91])  # own only, oldest first, no baselines
        self.assertEqual(len(self.client.get(self.URL, {"include_baseline": "true"}).json()), 6)
        # day 84 = 6 Nov, day 91 = 13 Nov
        self.assertEqual(days(self.client.get(self.URL, {"from": "2026-11-01", "to": "2026-11-10"})), [84])
        self.assertEqual(days(self.client.get(self.URL, {"from": "2026-11-13", "to": "2026-11-13"})), [91])
        self.assertErrorCode(self.client.get(self.URL, {"astronaut": self.mensah.pk}), 403, "PERMISSION_DENIED")
        pair = self.client.get(self.URL).json()[0]
        self.assertEqual(set(pair), {"check", "assessment"})
        self.as_user("adjei")
        self.assertEqual(len(self.client.get(self.URL).json()), 4)  # whole crew

    def test_v3_detail(self):
        self.baselines(self.osei)
        check, _, _ = self.scored(self.osei, 7)
        self.as_user("osei")
        body = self.client.get(f"{self.URL}{check.pk}/").json()
        self.assertEqual((body["check"]["id"], body["assessment"]["level"]), (check.pk, "GREEN"))
        self.as_user("mensah")
        self.assertErrorCode(self.client.get(f"{self.URL}{check.pk}/"), 403, "PERMISSION_DENIED")
        self.assertErrorCode(self.client.get(f"{self.URL}99999/"), 404, "NOT_FOUND")


class DailyLogApiTests(ApiTestBase):
    URL = "/api/v1/daily-logs/"

    def test_d1_create_then_update(self):
        self.as_user("osei")
        body = {"astronaut": self.osei.pk, "date": "2026-11-14", "resting_hr_bpm": 64, "systolic_mmhg": 118,
                "diastolic_mmhg": 76, "sleep_hours": 6.0, "mood": 3, "sodium_mg": 3400, "exercise_min": 90}
        r = self.client.post(self.URL, body, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        data = r.json()
        self.assertEqual((data["mission_day"], data["sleep_hours"]), (92, 6.0))
        self.assertEqual({k: v["level"] for k, v in data["vitals_status"].items()},
                         {"heart": "GREEN", "blood_pressure": "GREEN", "sleep": "AMBER", "mood": "AMBER"})
        r = self.client.post(self.URL, {"astronaut": self.osei.pk, "date": "2026-11-14", "sleep_hours": 7.5}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()["sleep_hours"], r.json()["mood"]), (7.5, 3))  # mood kept
        self.assertEqual(r.json()["vitals_status"]["sleep"]["level"], "GREEN")
        self.assertEqual(DailyLog.objects.count(), 1)

    def test_d1_only_some_values(self):
        self.as_user("osei")
        r = self.client.post(self.URL, {"astronaut": self.osei.pk, "date": "2026-11-14", "mood": 5}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["vitals_status"]["heart"]["level"], "UNKNOWN")

    def test_d1_permissions_and_validation(self):
        self.as_user("osei")
        for astronaut, code in [(self.mensah.pk, 403), (99999, 404)]:
            r = self.client.post(self.URL, {"astronaut": astronaut, "date": "2026-11-14", "mood": 4}, format="json")
            self.assertEqual(r.status_code, code)
        r = self.client.post(self.URL, {"astronaut": self.osei.pk, "date": "2026-11-14", "mood": 9}, format="json")
        self.assertEqual(r.json()["error"]["details"]["mood"], ["Must be between 1 and 5."])
        r = self.client.post(self.URL, {"mood": 4}, format="json")
        self.assertIn("astronaut", r.json()["error"]["details"])
        self.as_user("surgeon")
        r = self.client.post(self.URL, {"astronaut": self.osei.pk, "date": "2026-11-14", "mood": 4}, format="json")
        self.assertErrorCode(r, 403, "PERMISSION_DENIED")

    def test_d2_history(self):
        for astronaut in (self.osei, self.mensah):
            for d in (1, 2):
                DailyLog.objects.create(astronaut=astronaut, date=START + timedelta(days=d - 1), mood=4)
        self.as_user("osei")
        self.assertEqual({x["astronaut"] for x in self.client.get(self.URL).json()}, {self.osei.pk})
        self.assertEqual(len(self.client.get(self.URL, {"to": "2026-08-15"}).json()), 1)
        self.assertErrorCode(self.client.get(self.URL, {"astronaut": self.mensah.pk}), 403, "PERMISSION_DENIED")
        self.as_user("surgeon")
        self.assertEqual(len(self.client.get(self.URL).json()), 4)
