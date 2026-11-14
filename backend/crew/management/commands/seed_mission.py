import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from checks.models import VisionCheck
from crew.models import Astronaut, Baseline
from environment.models import EnvLog
from scoring.models import Status
from scoring.services import score_check


class Command(BaseCommand):
    help = "Wipe and reseed mission data deterministically."

    def handle(self, *args, **options):
        rng = random.Random(42)

        Status.objects.all().delete()
        VisionCheck.objects.all().delete()
        EnvLog.objects.all().delete()
        Baseline.objects.all().delete()
        Astronaut.objects.all().delete()

        today = timezone.localdate()
        mission_start = today - timedelta(days=91)

        osei = Astronaut.objects.create(name="Commander Ama Osei", role=Astronaut.Role.COMMANDER, mission_start=mission_start)
        mensah = Astronaut.objects.create(name="Pilot Kojo Mensah", role=Astronaut.Role.PILOT, mission_start=mission_start)
        adjei = Astronaut.objects.create(name="Specialist Efua Adjei", role=Astronaut.Role.SPECIALIST, mission_start=mission_start)

        Baseline.objects.create(astronaut=osei, near_vision=0.10, contrast=1.65, sample_count=3)
        Baseline.objects.create(astronaut=mensah, near_vision=0.00, contrast=1.80, sample_count=3)
        Baseline.objects.create(astronaut=adjei, near_vision=0.00, contrast=1.80, sample_count=3)

        for day in range(1, 93):
            date = mission_start + timedelta(days=day - 1)
            if 80 <= day <= 90:
                co2 = rng.uniform(4.0, 4.8)
            elif day >= 91:
                co2 = rng.uniform(2.4, 2.8)
            else:
                co2 = rng.uniform(2.2, 2.8)
            EnvLog.objects.create(
                date=date,
                co2_mmhg=co2,
                sodium_mg=rng.uniform(2800, 3300),
                exercise_min=int(rng.uniform(135, 165)),
            )

        check_days = [8, 15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92]

        osei_near     = [0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.2,0.3]
        osei_contrast = [1.65]*12 + [1.50]
        osei_amsler_r = [[]]*11 + [[[9,11],[9,12]], [[9,11],[9,12],[10,11]]]
        osei_symptoms = [(0,0,0)]*11 + [(1,1,1),(2,1,2)]

        mensah_symptoms = [(0,0,0)]*6 + [(1,0,0)] + [(0,0,0)]*6

        adjei_near     = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.0,0.1,0.1]
        adjei_contrast = [1.80]*12 + [1.70]
        adjei_symptoms = [(0,0,0)]*12 + [(1,1,1)]

        all_checks = []
        for i, day in enumerate(check_days):
            date = mission_start + timedelta(days=day - 1)

            h, ep, bl = osei_symptoms[i]
            c = VisionCheck.objects.create(
                astronaut=osei, date=date,
                near_vision=osei_near[i], contrast=osei_contrast[i],
                amsler_right=osei_amsler_r[i], amsler_left=[],
                headache=h, eye_pressure=ep, blur=bl,
            )
            all_checks.append(c)

            h, ep, bl = mensah_symptoms[i]
            c = VisionCheck.objects.create(
                astronaut=mensah, date=date,
                near_vision=0.0, contrast=1.80,
                amsler_right=[], amsler_left=[],
                headache=h, eye_pressure=ep, blur=bl,
            )
            all_checks.append(c)

            h, ep, bl = adjei_symptoms[i]
            c = VisionCheck.objects.create(
                astronaut=adjei, date=date,
                near_vision=adjei_near[i], contrast=adjei_contrast[i],
                amsler_right=[], amsler_left=[],
                headache=h, eye_pressure=ep, blur=bl,
            )
            all_checks.append(c)

        all_checks.sort(key=lambda c: (c.date, c.pk))
        for check in all_checks:
            score_check(check)

        for astronaut in [osei, mensah, adjei]:
            latest = (
                astronaut.checks.select_related("status")
                .order_by("date", "id")
                .last()
            )
            st = latest.status
            self.stdout.write(
                f"{astronaut.name}: day {latest.mission_day} | {st.level} | {st.reason} | env: {st.env_insight or '—'}"
            )
