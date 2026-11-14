"""python manage.py seed_mission [--reset] [--today-day 92] [--seed 42]   (docs/05_SEED_DATA_SPEC.md)

Builds the demo story from core/seed_data.py, relative to today, with a fixed random seed so
every run gives the same data. Every scored eye test goes through checks.services.submit_check,
so assessments are real engine output (spec 05 §7).
"""
import os
import random
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from checks.models import VisionCheck
from checks.services import submit_check
from core import seed_data as story
from crew.models import Astronaut
from missions.models import CabinLog, Mission
from scoring.models import Assessment
from vitals.models import DailyLog

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the SightLine demo story (missions, crew, logins, logs, eye tests)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing mission data and seed users first.")
        parser.add_argument("--today-day", type=int, default=92, help="Mission day of today on the active mission.")
        parser.add_argument("--seed", type=int, default=42, help="Random seed (same seed = same data).")

    def handle(self, *args, reset, today_day, seed, **options):
        if today_day < 92:
            raise CommandError("--today-day must be at least 92: the story's events happen up to day 91.")
        password = os.environ.get("SEED_DEMO_PASSWORD", story.DEFAULT_PASSWORD)
        self.rng = random.Random(seed)
        self.today = timezone.localdate()

        with transaction.atomic():
            if reset:
                self._reset()
            elif Mission.objects.exists():
                raise CommandError("Mission data already exists. Run with --reset to wipe it and seed again.")

            missions = self._missions(today_day)
            astronauts = self._crew(missions, password)
            self._cabin_logs(missions)
            self._daily_logs(missions, astronauts)
            self._checks(missions, astronauts)

        self._summary(missions, astronauts, password, today_day)

    # --- reset -------------------------------------------------------------------

    def _reset(self):
        Mission.objects.all().delete()  # cascades: astronauts, baselines, checks, assessments, logs
        seed_usernames = [a["username"] for a in story.ASTRONAUTS] + [story.SURGEON["username"], story.ADMIN_USERNAME]
        # Superusers are never deleted (e.g. the admin you created yourself on Neon).
        User.objects.filter(username__in=seed_usernames, is_superuser=False).delete()

    # --- missions + people ---------------------------------------------------------

    def _missions(self, today_day):
        missions = {}
        for spec in story.MISSIONS:
            if spec["active"]:
                start = self.today - timedelta(days=today_day - 1)  # today is day `today_day`
                last_day = today_day
            else:
                start = self.today - timedelta(days=spec["start_days_ago"])
                last_day = spec["last_day"]
            mission = Mission.objects.create(
                name=spec["name"], environment=spec["environment"], gravity_g=Decimal(spec["gravity_g"]),
                start_date=start, planned_duration_days=spec["planned_duration_days"], is_active=spec["active"],
            )
            missions[spec["key"]] = {"obj": mission, "spec": spec, "last_day": last_day}
        return missions

    def _crew(self, missions, password):
        astronauts = []
        for spec in story.ASTRONAUTS:
            is_mo = spec.get("medical_officer", False)
            astronaut = Astronaut.objects.create(
                mission=missions[spec["mission"]]["obj"], full_name=spec["full_name"], call_sign=spec["call_sign"],
                crew_role=spec["crew_role"], is_medical_officer=is_mo,
            )
            first, last = spec["full_name"].split(" ", 1)
            role = User.Role.MEDICAL_OFFICER if is_mo else User.Role.CREW
            self._user(spec["username"], password, role=role, astronaut=astronaut, first_name=first, last_name=last)
            astronauts.append((astronaut, spec))

        self._user(story.SURGEON["username"], password, role=User.Role.FLIGHT_SURGEON,
                   first_name=story.SURGEON["first_name"], last_name=story.SURGEON["last_name"])
        if User.objects.filter(username=story.ADMIN_USERNAME).exists():
            self.admin_note = f"'{story.ADMIN_USERNAME}' already existed: left unchanged (password not touched)."
        else:
            User.objects.create_superuser(story.ADMIN_USERNAME, "", password)
            self.admin_note = None
        return astronauts

    def _user(self, username, password, **fields):
        user, _ = User.objects.update_or_create(username=username, defaults={**fields, "is_active": True})
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save()

    # --- logs ------------------------------------------------------------------------

    def _day(self, mission_info, day):
        return mission_info["obj"].start_date + timedelta(days=day - 1)

    def _uniform(self, low, high, places):
        return Decimal(str(round(self.rng.uniform(low, high), places)))

    def _cabin_logs(self, missions):
        rows = []
        for info in missions.values():
            for day in range(1, info["last_day"] + 1):
                low, high = next(r for first, last, r in reversed(info["spec"]["co2"]) if first <= day <= last)
                rows.append(CabinLog(
                    mission=info["obj"], date=self._day(info, day), mission_day=day,
                    co2_mmhg=self._uniform(low, high, 2),
                    temperature_c=self._uniform(21.5, 23.0, 1), humidity_pct=self._uniform(40, 50, 1),
                ))
        CabinLog.objects.bulk_create(rows)  # mission_day set here: bulk_create skips save()

    def _daily_logs(self, missions, astronauts):
        rows = []
        for astronaut, spec in astronauts:
            info = missions[spec["mission"]]
            last = info["last_day"]
            for day in range(1, last + 1):
                if day <= last - story.NEVER_SKIP_LAST_DAYS and self.rng.random() < story.SKIP_DAY_CHANCE:
                    continue
                ranges = dict(story.NORMAL_DAILY)
                for first, until, changes in spec.get("daily", []):
                    if first <= day <= until:
                        ranges.update(changes)
                values = {
                    field: (self._uniform(low, high, 1) if field == "sleep_hours" else self.rng.randint(low, high))
                    for field, (low, high) in ranges.items()
                }
                values["sodium_mg"] = round(values["sodium_mg"], -1)
                rows.append(DailyLog(astronaut=astronaut, date=self._day(info, day), mission_day=day, **values))
        DailyLog.objects.bulk_create(rows)

    # --- eye tests -----------------------------------------------------------------------

    def _taken_at(self, info, day):
        """That day, 08:00–10:00 UTC at a random minute (spec 05 §7)."""
        d = self._day(info, day)
        return datetime(d.year, d.month, d.day, 8, tzinfo=dt_timezone.utc) + timedelta(minutes=self.rng.randint(0, 119))

    def _check_data(self, astronaut, values, taken_at, is_baseline=False):
        near, contrast = values["near"], values["contrast"]
        amsler = values.get("amsler", ([], []))
        symptoms = values.get("symptoms", (0, 0, 0))
        return {
            "astronaut": astronaut, "is_baseline": is_baseline, "taken_at": taken_at,
            "near_vision_left": near[0], "near_vision_right": near[1],
            "contrast_left": contrast[0], "contrast_right": contrast[1],
            "amsler_left": amsler[0], "amsler_right": amsler[1],
            "headache": symptoms[0], "eye_pressure": symptoms[1], "blur": symptoms[2],
        }

    def _checks(self, missions, astronauts):
        for astronaut, spec in astronauts:
            info = missions[spec["mission"]]
            # Pre-flight baselines: days -30, -20, -10.
            for i, day in enumerate(story.BASELINE_DAYS):
                values = {"near": tuple(spec["baseline"]["near"][eye][i] for eye in (0, 1)),
                          "contrast": tuple(spec["baseline"]["contrast"][eye][i] for eye in (0, 1))}
                submit_check(self._check_data(astronaut, values, self._taken_at(info, day), is_baseline=True))

            # Weekly checks (days 7, 14, … before the last day) plus extra retest days, in date order.
            weekly = set(range(7, info["last_day"], 7))
            for day in sorted(weekly | set(spec.get("checks", {}))):
                values = {**spec["normal"], **spec.get("checks", {}).get(day, {})}
                submit_check(self._check_data(astronaut, values, self._taken_at(info, day)))
            self.stdout.write(f"  {spec['call_sign']:<9} {spec['mission']:<8} eye tests saved")

    # --- summary ---------------------------------------------------------------------------

    def _summary(self, missions, astronauts, password, today_day):
        ares = next(i["obj"] for i in missions.values() if i["spec"]["active"])
        scored = VisionCheck.objects.filter(is_baseline=False).count()
        baseline = VisionCheck.objects.filter(is_baseline=True).count()
        w = self.stdout.write
        w("")
        w(self.style.SUCCESS(f'Mission "{ares.name}" · today = day {today_day} (active)'))
        for info in missions.values():
            if not info["spec"]["active"]:
                m = info["obj"]
                w(f'Mission "{m.name}" · {m.get_environment_display()} · finished ({m.planned_duration_days} days)')
        w(f"Checks: {scored} scored, {baseline} baseline · daily logs: {DailyLog.objects.count()} · "
          f"cabin logs: {CabinLog.objects.count()}")
        w("")
        w("Latest status per astronaut:")
        for astronaut, spec in astronauts:
            latest = (Assessment.objects.filter(astronaut=astronaut).select_related("vision_check")
                      .order_by("-vision_check__taken_at").first())
            mo = " (MO)" if spec.get("medical_officer") else ""
            w(f"  {spec['username']:<9} {astronaut.mission.name:<18} {latest.level:<5} (day {latest.vision_check.mission_day}){mo}")
        w("")
        users = ", ".join(a["username"] for a in story.ASTRONAUTS)
        w(f"Logins: {users}, {story.SURGEON['username']} (flight surgeon), {story.ADMIN_USERNAME} (admin)")
        w(f"Password: {password}" + ("" if "SEED_DEMO_PASSWORD" in os.environ else "  (default; set SEED_DEMO_PASSWORD to change)"))
        if self.admin_note:
            w(self.style.WARNING(self.admin_note))
