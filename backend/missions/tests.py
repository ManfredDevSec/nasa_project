"""T3: CabinLog."""
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from .models import CabinLog, Mission


def make_mission(**overrides):
    fields = dict(
        name="Ares Transit 1", environment="TRANSIT", gravity_g=0,
        start_date=date(2026, 8, 15), planned_duration_days=900, is_active=True,
    )
    return Mission.objects.create(**{**fields, **overrides})


class CabinLogTests(TestCase):
    def setUp(self):
        self.mission = make_mission()

    def test_mission_day_computed_on_save(self):
        log = CabinLog.objects.create(mission=self.mission, date=date(2026, 11, 14), co2_mmhg=Decimal("4.60"))
        self.assertEqual(log.mission_day, 92)

    def test_mission_day_follows_date_changes(self):
        log = CabinLog.objects.create(mission=self.mission, date=date(2026, 8, 15), co2_mmhg=Decimal("2.40"))
        log.date = date(2026, 8, 20)
        log.save()
        self.assertEqual(log.mission_day, 6)

    def test_one_log_per_mission_day(self):
        CabinLog.objects.create(mission=self.mission, date=date(2026, 9, 1), co2_mmhg=Decimal("2.5"))
        with self.assertRaises(IntegrityError):
            CabinLog.objects.create(mission=self.mission, date=date(2026, 9, 1), co2_mmhg=Decimal("3.0"))

    def test_ranges(self):
        for field, bad in [("co2_mmhg", Decimal("15.01")), ("co2_mmhg", Decimal("-1")), ("humidity_pct", Decimal("101"))]:
            log = CabinLog(mission=self.mission, date=date(2026, 9, 2), co2_mmhg=Decimal("2.5"))
            setattr(log, field, bad)
            with self.subTest(field=field, value=bad), self.assertRaises(ValidationError):
                log.full_clean()

    def test_temperature_and_humidity_optional(self):
        log = CabinLog(mission=self.mission, date=date(2026, 9, 3), co2_mmhg=Decimal("2.5"))
        log.full_clean(exclude=["mission_day"])  # computed on save
