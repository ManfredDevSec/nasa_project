from unittest import mock

from django.test import TestCase


class HealthTests(TestCase):
    def test_healthy(self):
        r = self.client.get("/api/health/")
        self.assertEqual((r.status_code, r.json()), (200, {"status": "ok", "database": "ok", "cache": "ok"}))

    def test_cache_down_is_503(self):
        with mock.patch("core.views.cache.set", side_effect=ConnectionError("redis down")):
            r = self.client.get("/api/health/")
        self.assertEqual((r.status_code, r.json()["cache"]), (503, "error"))
