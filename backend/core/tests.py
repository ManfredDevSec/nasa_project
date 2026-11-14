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


class HealthHostCheckTests(TestCase):
    """Render's health checker may use an internal hostname; only /api/health/ may skip the host check."""

    @mock.patch("django.conf.settings.ALLOWED_HOSTS", ["sightline-api.onrender.com"])
    def test_health_works_with_unknown_host(self):
        r = self.client.get("/api/health/", HTTP_HOST="10.0.0.7:10000")
        self.assertEqual(r.status_code, 200)

    @mock.patch("django.conf.settings.ALLOWED_HOSTS", ["sightline-api.onrender.com"])
    def test_other_pages_still_reject_unknown_host(self):
        r = self.client.get("/api/v1/auth/me/", HTTP_HOST="evil.example.com")
        self.assertEqual(r.status_code, 400)
