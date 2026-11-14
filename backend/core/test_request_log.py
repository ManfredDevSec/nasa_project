"""T13: request logging + X-Request-ID."""
from accounts.tests import AuthTestBase


class RequestLogTests(AuthTestBase):
    def test_line_has_method_path_status_user_and_code(self):
        token = self.login().json()["token"]
        self.auth(token)
        other = self.astronauts["mensah"].pk
        with self.assertLogs("sightline.requests", level="INFO") as logs:
            r = self.client.get(f"/api/v1/astronauts/{other}/?email=secret@example.com")
        line = logs.output[-1]
        user = self.users["osei"].pk
        self.assertRegex(line, rf"^INFO:sightline.requests:GET /api/v1/astronauts/{other}/ 403 \d+ms user={user} id=\w+ code=PERMISSION_DENIED$")
        self.assertIn(r["X-Request-ID"], line)
        for private in ("secret@example.com", token, "email="):
            self.assertNotIn(private, line)  # no query strings, no tokens

    def test_incoming_request_id_is_kept_if_safe(self):
        r = self.client.get("/api/v1/auth/me/", HTTP_X_REQUEST_ID="frontend-abc-123")
        self.assertEqual(r["X-Request-ID"], "frontend-abc-123")
        r = self.client.get("/api/v1/auth/me/", HTTP_X_REQUEST_ID="bad id\nwith newline")
        self.assertRegex(r["X-Request-ID"], r"^[0-9a-f]{12}$")  # replaced, can't inject log lines

    def test_login_body_never_logged(self):
        with self.assertLogs("sightline.requests", level="INFO") as logs:
            self.login(password="my-secret-password")
        self.assertNotIn("my-secret-password", "\n".join(logs.output))
        self.assertIn("code=INVALID_CREDENTIALS", logs.output[-1])

    def test_health_checks_not_logged(self):
        with self.assertNoLogs("sightline.requests", level="INFO"):
            self.client.get("/api/health/")
