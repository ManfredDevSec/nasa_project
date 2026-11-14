import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from .content import BODY_PARTS, PART_CONTENT

NASA_RESOURCES = Path(settings.BASE_DIR).parent / "docs" / "08_NASA_RESOURCES.md"


class BodyMapContentTests(SimpleTestCase):
    def test_every_part_has_the_card_fields(self):
        self.assertEqual(set(PART_CONTENT), set(BODY_PARTS))
        for part, content in PART_CONTENT.items():
            with self.subTest(part=part):
                self.assertEqual(set(content["info"]), {"function", "space_effect", "what_to_do"})
                self.assertTrue(all(content["info"].values()))
                self.assertEqual(set(content["action"]), {"label", "route"})
                self.assertTrue(content["action"]["route"].startswith("/"))
                self.assertTrue(content["no_data_summary"])

    def test_read_more_links_come_from_nasa_resources(self):
        """docs/08 rule: only use sources listed there."""
        if not NASA_RESOURCES.exists():  # docs/ isn't inside the Docker image
            self.skipTest("docs/08_NASA_RESOURCES.md not available")
        allowed = set(re.findall(r"https://www\.nasa\.gov/\S+?/(?=\s|\)|$)", NASA_RESOURCES.read_text()))
        for part, content in PART_CONTENT.items():
            with self.subTest(part=part):
                self.assertIn(content["read_more_url"], allowed)
