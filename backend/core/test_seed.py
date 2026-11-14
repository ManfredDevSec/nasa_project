"""T8: seed_mission command (docs/05 §8–9, plus the extended crew)."""
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from checks.models import VisionCheck
from crew.models import Astronaut, Baseline
from missions.models import Mission
from scoring.models import Assessment
from vitals.models import DailyLog

User = get_user_model()
FAST = override_settings(
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)


def seed(*args):
    call_command("seed_mission", *args, stdout=StringIO())


def latest(username):
    return (Assessment.objects.filter(astronaut__user__username=username)
            .select_related("vision_check").order_by("-vision_check__taken_at").first())


def check_on(username, day):
    return VisionCheck.objects.select_related("assessment").get(
        astronaut__user__username=username, mission_day=day, is_baseline=False)


@FAST
class SeedStoryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed()

    def test_missions_and_crew(self):
        self.assertEqual(Mission.objects.count(), 3)
        self.assertEqual(list(Mission.objects.filter(is_active=True).values_list("name", flat=True)), ["Ares Transit 1"])
        self.assertEqual(Astronaut.objects.count(), 12)
        for mission in Mission.objects.all():
            self.assertEqual(mission.astronauts.filter(is_medical_officer=True).count(), 1, mission.name)
        self.assertEqual(Baseline.objects.count(), 12)

    def test_logins(self):
        self.assertEqual(User.objects.filter(astronaut__isnull=False).count(), 12)
        self.assertEqual(User.objects.get(username="adjei").role, "MEDICAL_OFFICER")
        self.assertEqual(User.objects.get(username="osei").role, "CREW")
        surgeon = User.objects.get(username="surgeon")
        self.assertEqual((surgeon.role, surgeon.display_name), ("FLIGHT_SURGEON", "Dr. Yaw Boateng"))
        admin = User.objects.get(username="admin")
        self.assertTrue(admin.is_superuser and admin.role == "ADMIN")
        self.assertTrue(User.objects.get(username="owusu").check_password("sightline-demo"))

    # --- spec 05 §9 acceptance checks available before T10/T11 ----------------------
    def test_latest_statuses(self):
        self.assertEqual((latest("osei").level, latest("osei").vision_check.mission_day), ("RED", 91))
        self.assertEqual(latest("mensah").level, "GREEN")
        self.assertEqual(latest("adjei").level, "GREEN")

    def test_osei_day_91(self):
        a = check_on("osei", 91).assessment
        self.assertTrue(a.new_amsler_left)
        self.assertIn("CO2", [i["factor"] for i in a.env_insights])
        self.assertTrue(a.escalate_to_earth)

    def test_story_days(self):
        expected = {("osei", 77): "GREEN", ("osei", 84): "AMBER", ("osei", 86): "AMBER",
                    ("adjei", 42): "AMBER", ("adjei", 44): "GREEN", ("adjei", 49): "GREEN"}
        for (user, day), level in expected.items():
            self.assertEqual(check_on(user, day).assessment.level, level, f"{user} day {day}")
        self.assertIn("CO2", [i["factor"] for i in check_on("osei", 84).assessment.env_insights])

    def test_day_92_left_for_the_live_demo(self):
        self.assertFalse(VisionCheck.objects.filter(astronaut__user__username="osei", mission_day=92).exists())
        self.assertEqual(DailyLog.objects.filter(astronaut__mission__is_active=True, mission_day__in=[91, 92]).count(), 12)

    def test_check_counts(self):
        # spec 05 §7 schedule: Osei 14, Mensah 13, Adjei 14 → 41 (spec text said 42)
        core = VisionCheck.objects.filter(is_baseline=False, astronaut__user__username__in=["osei", "mensah", "adjei"])
        self.assertEqual(core.count(), 41)
        self.assertEqual(VisionCheck.objects.filter(is_baseline=True).count(), 36)

    # --- extended crew -----------------------------------------------------------------
    def test_extended_crew_stories(self):
        self.assertEqual(latest("owusu").level, "AMBER")
        self.assertEqual(check_on("agyeman", 84).assessment.level, "AMBER")   # fresh downward trend
        self.assertEqual(check_on("agyeman", 91).assessment.level, "GREEN")   # 1 line is fine on the Moon
        self.assertEqual(check_on("bonsu", 154).assessment.level, "RED")
        self.assertTrue(check_on("bonsu", 154).assessment.new_amsler_right)
        self.assertEqual(latest("bonsu").level, "GREEN")

    def test_refuses_without_reset(self):
        with self.assertRaises(CommandError):
            seed()


@FAST
class SeedResetTests(TestCase):
    def snapshot(self):
        return [(c.astronaut.call_sign, c.mission_day, c.taken_at, c.near_vision_left, c.contrast_right,
                 getattr(getattr(c, "assessment", None), "level", "BASELINE"))
                for c in VisionCheck.objects.select_related("astronaut", "assessment").order_by("astronaut__call_sign", "taken_at")]

    def test_reset_gives_identical_results(self):
        seed()
        first = self.snapshot()
        seed("--reset")
        self.assertEqual(self.snapshot(), first)

    def test_reset_keeps_your_own_superuser(self):
        User.objects.create_superuser("admin", "", "my-own-strong-password-123")
        out = StringIO()
        call_command("seed_mission", stdout=out)
        call_command("seed_mission", "--reset", stdout=StringIO())
        admin = User.objects.get(username="admin")
        self.assertTrue(admin.check_password("my-own-strong-password-123"))
        self.assertIn("left unchanged", out.getvalue())
