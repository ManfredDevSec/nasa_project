"""T1: every API error uses the standard format (docs/01 §5)."""
from django.test import SimpleTestCase, override_settings
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from .exceptions import ConflictError

factory = APIRequestFactory()


def make_view(exc, permission_classes=None):
    class RaisingView(APIView):
        def get(self, request):
            raise exc

    if permission_classes is not None:
        RaisingView.permission_classes = permission_classes
    return RaisingView.as_view()


class StandardErrorFormatTests(SimpleTestCase):
    def assertError(self, response, status, code):
        self.assertEqual(response.status_code, status)
        body = response.data if hasattr(response, "data") else response.json()
        self.assertEqual(set(body), {"error"})
        self.assertEqual(set(body["error"]), {"code", "message", "details"})
        self.assertEqual(body["error"]["code"], code)
        return body["error"]

    # --- unknown URLs ---
    def test_unknown_api_url_get(self):
        self.assertError(self.client.get("/api/v1/nope/"), 404, "NOT_FOUND")

    def test_unknown_api_url_post_is_json_not_csrf_page(self):
        self.assertError(self.client.post("/api/v1/nope"), 404, "NOT_FOUND")

    # --- DRF errors from views ---
    def test_validation_error_with_fields(self):
        exc = serializers.ValidationError({"near_vision_left": ["Must be between 1 and 10."]})
        view = make_view(exc, [AllowAny])
        err = self.assertError(view(factory.get("/")), 400, "VALIDATION_ERROR")
        self.assertEqual(err["message"], "Some fields are invalid.")
        self.assertEqual(err["details"], {"near_vision_left": ["Must be between 1 and 10."]})

    def test_validation_error_without_fields(self):
        view = make_view(serializers.ValidationError("Bad combo."), [AllowAny])
        err = self.assertError(view(factory.get("/")), 400, "VALIDATION_ERROR")
        self.assertEqual(err["details"], {"non_field_errors": ["Bad combo."]})

    def test_missing_token_is_401(self):
        view = make_view(Exception("never reached"))  # default IsAuthenticated
        self.assertError(view(factory.get("/")), 401, "NOT_AUTHENTICATED")

    def test_custom_conflict_code(self):
        view = make_view(ConflictError("No baseline yet.", code="NO_BASELINE"), [AllowAny])
        err = self.assertError(view(factory.get("/")), 409, "NO_BASELINE")
        self.assertEqual(err["message"], "No baseline yet.")

    @override_settings(DEBUG=False)
    def test_unexpected_crash_is_500_server_error(self):
        view = make_view(RuntimeError("boom"), [AllowAny])
        with self.assertLogs("sightline.exceptions", level="ERROR"):
            err = self.assertError(view(factory.get("/")), 500, "SERVER_ERROR")
        self.assertNotIn("boom", err["message"])  # no internals leaked
