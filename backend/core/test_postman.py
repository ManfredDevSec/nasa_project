"""T13: the Postman / Thunder Client collection is complete, current, and its requests work."""
import json
import re
from pathlib import Path
from unittest import skipUnless

from django.conf import settings
from drf_spectacular.generators import SchemaGenerator

from accounts.tests import AuthTestBase
from core.management.commands.export_postman import render_files
from core.test_api import at, scores
from checks.services import submit_check

API_DOCS = Path(settings.BASE_DIR).parent / "docs" / "api"


def requests_in(collection):
    return [r for folder in collection["item"] for r in folder["item"]]


class PostmanCollectionTests(AuthTestBase):
    def setUp(self):
        super().setUp()
        self.files = render_files()
        self.collection = json.loads(self.files["SightLine.postman_collection.json"])

    @skipUnless(API_DOCS.exists(), "docs/ not available (e.g. inside the Docker image)")
    def test_committed_files_are_up_to_date(self):
        for name, text in self.files.items():
            with self.subTest(name):
                self.assertEqual((API_DOCS / name).read_text(), text,
                                 "Out of date: run `python manage.py export_postman` and commit docs/api/.")

    def test_every_endpoint_has_a_request(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        operations = {(m.upper(), path) for path, ops in schema["paths"].items() for m in ops
                      if m in ("get", "post", "put", "patch", "delete")}
        self.assertEqual(len(requests_in(self.collection)), len(operations))

    def test_login_saves_the_token_and_public_endpoints_have_no_auth(self):
        login = next(r for r in requests_in(self.collection) if r["request"]["url"]["raw"].endswith("/auth/login/"))
        self.assertIn("pm.collectionVariables.set('token'", "\n".join(login["event"][0]["script"]["exec"]))
        self.assertEqual(json.loads(login["request"]["body"]["raw"]), {"username": "{{username}}", "password": "{{password}}"})
        public = {r["request"]["url"]["raw"].split("?")[0] for r in requests_in(self.collection)
                  if r["request"].get("auth", {}).get("type") == "noauth"}
        self.assertEqual(public, {"{{base_url}}/api/health/", "{{base_url}}/api/v1/auth/login/",
                                  "{{base_url}}/api/v1/auth/password/reset/", "{{base_url}}/api/v1/auth/password/reset/confirm/"})
        self.assertEqual(self.collection["auth"]["bearer"][0]["value"], "{{token}}")

    def test_every_get_request_works(self):
        """Fill in the variables like Postman would and send each GET (as the admin, who may see everything)."""
        osei = self.astronauts["osei"]
        for day in (-30, -20, -10):
            submit_check({"astronaut": osei, "is_baseline": True, "taken_at": at(day), **scores()})
        check, _, _ = submit_check({"astronaut": osei, "taken_at": at(7), **scores()})
        variables = {"base_url": "", "astronaut_id": osei.pk, "check_id": check.pk, "user_id": self.users["osei"].pk}
        self.auth(self.login("admin").json()["token"])

        gets = [r for r in requests_in(self.collection) if r["request"]["method"] == "GET"]
        self.assertGreaterEqual(len(gets), 15)
        for item in gets:
            url = re.sub(r"\{\{(\w+)\}\}", lambda m: str(variables[m.group(1)]), item["request"]["url"]["raw"].split("?")[0])
            with self.subTest(item["name"]):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200, f"{url}: {response.content[:200]}")
