from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase


class SightLineAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_mission", verbosity=0)

    def test_list_astronauts_returns_three(self):
        resp = self.client.get("/api/astronauts/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 3)
        names = {a["name"] for a in data}
        self.assertIn("Commander Ama Osei", names)

    def test_post_check_returns_201_with_level(self):
        from crew.models import Astronaut
        astronaut = Astronaut.objects.order_by("id").first()
        payload = {
            "astronaut": astronaut.id,
            "near_vision": 0.1,
            "contrast": 1.65,
            "amsler_left": [],
            "amsler_right": [],
            "headache": 0,
            "eye_pressure": 0,
            "blur": 0,
        }
        resp = self.client.post("/api/checks/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("level", data)
        self.assertIn(data["level"], ["GREEN", "AMBER", "RED"])

    def test_history_includes_env(self):
        from crew.models import Astronaut
        astronaut = Astronaut.objects.order_by("id").first()
        resp = self.client.get(f"/api/astronauts/{astronaut.id}/history/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("env", data)
        self.assertGreater(len(data["env"]), 0)
        self.assertIn("co2_mmhg", data["env"][0])

    def test_weekly_report_returns_three_crew(self):
        today = timezone.localdate().isoformat()
        resp = self.client.get(f"/api/report/weekly/?end={today}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["crew"]), 3)
