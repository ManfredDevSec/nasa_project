"""T3: DailyLog."""
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from crew.models import Astronaut
from missions.tests import make_mission

from .models import DailyLog


class DailyLogTests(TestCase):
    def setUp(self):
        self.mission = make_mission()
        self.osei = Astronaut.objects.create(
            mission=self.mission, full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER"
        )

    def test_mission_day_from_astronauts_mission(self):
        log = DailyLog.objects.create(astronaut=self.osei, date=date(2026, 8, 15), sleep_hours=Decimal("7.5"))
        self.assertEqual(log.mission_day, 1)

    def test_all_values_optional(self):
        log = DailyLog(astronaut=self.osei, date=date(2026, 9, 1))
        log.full_clean(exclude=["mission_day"])
        log.save()
        self.assertIsNone(log.resting_hr_bpm)

    def test_one_log_per_astronaut_day(self):
        DailyLog.objects.create(astronaut=self.osei, date=date(2026, 9, 1), mood=4)
        with self.assertRaises(IntegrityError):
            DailyLog.objects.create(astronaut=self.osei, date=date(2026, 9, 1), mood=3)

    def test_ranges(self):
        # (field, lowest valid, highest valid) from docs/02 §3.7
        limits = [
            ("resting_hr_bpm", 30, 200), ("systolic_mmhg", 70, 220), ("diastolic_mmhg", 40, 140),
            ("sleep_hours", Decimal("0"), Decimal("24")), ("mood", 1, 5),
            ("sodium_mg", 0, 10000), ("exercise_min", 0, 600),
        ]
        for field, low, high in limits:
            for value, ok in [(low, True), (high, True), (high + 1, False)] + ([(low - 1, False)] if low > 0 else []):
                log = DailyLog(astronaut=self.osei, date=date(2026, 9, 2), **{field: value})
                with self.subTest(field=field, value=value):
                    if ok:
                        log.full_clean(exclude=["mission_day"])
                    else:
                        with self.assertRaises(ValidationError):
                            log.full_clean(exclude=["mission_day"])
