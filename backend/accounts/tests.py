"""T2: custom user, auth endpoints, password change/reset, permission helpers."""
import re
from datetime import date, timedelta
from unittest import mock

from django.core import mail
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from crew.models import Astronaut
from missions.models import Mission

from .models import User
from .permissions import can_edit_astronaut, can_view_astronaut, visible_astronauts

PASSWORD = "sightline-demo-pass"
LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


def make_world():
    """Two missions so 'same crew' is actually tested."""
    mission = Mission.objects.create(
        name="Ares Transit 1", environment="TRANSIT", gravity_g=0,
        start_date=date(2026, 8, 15), planned_duration_days=900, is_active=True,
    )
    other_mission = Mission.objects.create(
        name="Other", environment="STATION", gravity_g=0,
        start_date=date(2026, 1, 1), planned_duration_days=180,
    )
    osei = Astronaut.objects.create(mission=mission, full_name="Ama Osei", call_sign="Osei", crew_role="COMMANDER")
    mensah = Astronaut.objects.create(mission=mission, full_name="Kofi Mensah", call_sign="Mensah", crew_role="PILOT")
    adjei = Astronaut.objects.create(
        mission=mission, full_name="Efua Adjei", call_sign="Adjei", crew_role="SPECIALIST", is_medical_officer=True
    )
    stranger = Astronaut.objects.create(mission=other_mission, full_name="Sam Far", call_sign="Far", crew_role="PILOT")
    users = {
        "osei": User.objects.create_user("osei", "osei@example.com", PASSWORD, role="CREW", astronaut=osei),
        "mensah": User.objects.create_user("mensah", "", PASSWORD, role="CREW", astronaut=mensah),
        "adjei": User.objects.create_user("adjei", "", PASSWORD, role="MEDICAL_OFFICER", astronaut=adjei),
        "surgeon": User.objects.create_user(
            "surgeon", "", PASSWORD, role="FLIGHT_SURGEON", first_name="Yaw", last_name="Boateng"
        ),
        "admin": User.objects.create_superuser("admin", "", PASSWORD),
    }
    return {"osei": osei, "mensah": mensah, "adjei": adjei, "stranger": stranger}, users


@override_settings(
    CACHES=LOCMEM,  # tests never touch the real Redis
    PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"],  # fast hashing, tests only
)
class AuthTestBase(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()  # fresh throttle counters per test
        self.astronauts, self.users = make_world()
        self.client = APIClient()

    def login(self, username="osei", password=PASSWORD):
        return self.client.post("/api/v1/auth/login/", {"username": username, "password": password}, format="json")

    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def assertErrorCode(self, response, status, code):
        self.assertEqual(response.status_code, status, response.content)
        self.assertEqual(response.json()["error"]["code"], code)


class UserModelTests(AuthTestBase):
    def test_superuser_gets_admin_role(self):
        self.assertEqual(self.users["admin"].role, User.Role.ADMIN)

    def test_crew_needs_astronaut(self):
        with self.assertRaises(ValidationError):
            User(username="x", role="CREW").full_clean()

    def test_surgeon_cannot_have_astronaut(self):
        with self.assertRaises(ValidationError):
            User(username="x", role="FLIGHT_SURGEON", astronaut=self.astronauts["stranger"]).full_clean()

    def test_display_names(self):
        self.assertEqual(self.users["osei"].display_name, "Cmdr. Ama Osei")
        self.assertEqual(self.users["surgeon"].display_name, "Dr. Yaw Boateng")
        self.assertEqual(self.users["admin"].display_name, "admin")

    def test_only_one_active_mission(self):
        new = Mission.objects.create(
            name="Next", environment="MARS_BASE", gravity_g="0.38",
            start_date=date(2027, 1, 1), planned_duration_days=500, is_active=True,
        )
        self.assertEqual(list(Mission.objects.filter(is_active=True)), [new])

    def test_mission_day(self):
        mission = Mission.objects.get(name="Ares Transit 1")
        self.assertEqual(mission.mission_day(date(2026, 8, 15)), 1)
        self.assertEqual(mission.mission_day(date(2026, 11, 14)), 92)
        self.assertLessEqual(mission.mission_day(date(2026, 8, 1)), 0)


class LoginLogoutMeTests(AuthTestBase):
    def test_login_returns_token_and_user(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["token"])
        self.assertEqual(
            {k: body["user"][k] for k in ("username", "role", "display_name", "astronaut_id")},
            {"username": "osei", "role": "CREW", "display_name": "Cmdr. Ama Osei",
             "astronaut_id": self.astronauts["osei"].pk},
        )

    def test_login_twice_reuses_token(self):
        self.assertEqual(self.login().json()["token"], self.login().json()["token"])

    def test_wrong_password(self):
        self.assertErrorCode(self.login(password="nope"), 400, "INVALID_CREDENTIALS")

    def test_inactive_user_cannot_log_in(self):
        User.objects.filter(username="osei").update(is_active=False)
        self.assertErrorCode(self.login(), 400, "INVALID_CREDENTIALS")

    def test_missing_fields(self):
        r = self.client.post("/api/v1/auth/login/", {}, format="json")
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertEqual(set(r.json()["error"]["details"]), {"username", "password"})

    def test_me_needs_token(self):
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")

    def test_me_with_bad_token(self):
        self.auth("not-a-real-token")
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")

    def test_me_with_token(self):
        self.auth(self.login().json()["token"])
        r = self.client.get("/api/v1/auth/me/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], "osei")

    def test_surgeon_me_has_no_astronaut(self):
        self.auth(self.login("surgeon").json()["token"])
        body = self.client.get("/api/v1/auth/me/").json()
        self.assertEqual((body["role"], body["astronaut_id"]), ("FLIGHT_SURGEON", None))

    def test_update_profile_only_safe_fields(self):
        self.auth(self.login().json()["token"])
        r = self.client.patch(
            "/api/v1/auth/me/", {"email": "new@example.com", "role": "ADMIN", "username": "hacker"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        user = User.objects.get(pk=self.users["osei"].pk)
        self.assertEqual((user.email, user.role, user.username), ("new@example.com", "CREW", "osei"))

    def test_logout_kills_token(self):
        self.auth(self.login().json()["token"])
        self.assertEqual(self.client.post("/api/v1/auth/logout/").status_code, 204)
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")

    def test_expired_token_rejected_and_login_gives_new_one(self):
        old = self.login().json()["token"]
        Token.objects.filter(key=old).update(created=timezone.now() - timedelta(days=30))
        self.auth(old)
        r = self.client.get("/api/v1/auth/me/")
        self.assertErrorCode(r, 401, "NOT_AUTHENTICATED")
        self.assertIn("expired", r.json()["error"]["message"])
        self.client.credentials()
        self.assertNotEqual(self.login().json()["token"], old)

    def test_stale_token_does_not_block_login(self):
        self.auth("stale-token-from-yesterday")
        self.assertEqual(self.login().status_code, 200)

    def test_trailing_slash_hint(self):
        r = self.client.post("/api/v1/auth/login", {}, format="json")
        self.assertErrorCode(r, 404, "NOT_FOUND")
        self.assertIn("/api/v1/auth/login/", r.json()["error"]["message"])

    def test_login_is_rate_limited(self):
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"auth": "3/min"}):
            for _ in range(3):
                self.login(password="guess")
            self.assertErrorCode(self.login(password="guess"), 429, "THROTTLED")


class PasswordTests(AuthTestBase):
    def test_change_password_rotates_token(self):
        old = self.login().json()["token"]
        self.auth(old)
        r = self.client.post(
            "/api/v1/auth/password/change/",
            {"old_password": PASSWORD, "new_password": "brand-new-passphrase-42"}, format="json",
        )
        self.assertEqual(r.status_code, 200)
        new = r.json()["token"]
        self.assertNotEqual(new, old)
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")  # old token dead
        self.auth(new)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        self.assertEqual(self.login(password="brand-new-passphrase-42").status_code, 200)

    def test_change_password_wrong_old(self):
        self.auth(self.login().json()["token"])
        r = self.client.post(
            "/api/v1/auth/password/change/",
            {"old_password": "wrong", "new_password": "brand-new-passphrase-42"}, format="json",
        )
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertIn("old_password", r.json()["error"]["details"])

    def test_change_password_weak_new(self):
        self.auth(self.login().json()["token"])
        r = self.client.post(
            "/api/v1/auth/password/change/", {"old_password": PASSWORD, "new_password": "123"}, format="json"
        )
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertIn("new_password", r.json()["error"]["details"])

    def _request_reset(self, email="osei@example.com"):
        return self.client.post("/api/v1/auth/password/reset/", {"email": email}, format="json")

    def _link_parts(self):
        uid, token = re.search(r"uid=([\w-]+)&token=([\w-]+)", mail.outbox[-1].body).groups()
        return uid, token

    def test_reset_full_flow(self):
        old_token = self.login().json()["token"]
        self.assertEqual(self._request_reset().status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["osei@example.com"])
        self.assertIn("http://localhost:5173/reset-password?uid=", mail.outbox[0].body)

        uid, token = self._link_parts()
        r = self.client.post(
            "/api/v1/auth/password/reset/confirm/",
            {"uid": uid, "token": token, "new_password": "reset-passphrase-77"}, format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.login(password="reset-passphrase-77").status_code, 200)
        self.assertFalse(Token.objects.filter(key=old_token).exists())  # logged out everywhere

        # The link only works once.
        r = self.client.post(
            "/api/v1/auth/password/reset/confirm/",
            {"uid": uid, "token": token, "new_password": "another-passphrase-88"}, format="json",
        )
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertIn("token", r.json()["error"]["details"])

    def test_reset_unknown_email_looks_the_same(self):
        known, unknown = self._request_reset(), self._request_reset("nobody@example.com")
        self.assertEqual((known.status_code, known.json()), (unknown.status_code, unknown.json()))
        self.assertEqual(len(mail.outbox), 1)  # only the real account got mail

    def test_reset_bad_link(self):
        r = self.client.post(
            "/api/v1/auth/password/reset/confirm/",
            {"uid": "garbage", "token": "garbage", "new_password": "reset-passphrase-77"}, format="json",
        )
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")

    def test_reset_weak_password(self):
        self._request_reset()
        uid, token = self._link_parts()
        r = self.client.post(
            "/api/v1/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "123"}, format="json"
        )
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
        self.assertIn("new_password", r.json()["error"]["details"])


class PermissionHelperTests(AuthTestBase):
    def check(self, username, astronaut, view, edit):
        user, a = self.users[username], self.astronauts[astronaut]
        self.assertEqual(can_view_astronaut(user, a), view, f"{username} view {astronaut}")
        self.assertEqual(can_edit_astronaut(user, a), edit, f"{username} edit {astronaut}")
        self.assertEqual(can_view_astronaut(user, a.pk), view, "works with an id too")

    def test_crew_only_self(self):
        self.check("osei", "osei", True, True)
        self.check("osei", "mensah", False, False)
        self.check("osei", "stranger", False, False)

    def test_medical_officer_whole_crew_only(self):
        self.check("adjei", "osei", True, True)
        self.check("adjei", "adjei", True, True)
        self.check("adjei", "stranger", False, False)

    def test_surgeon_reads_everything_writes_nothing(self):
        self.check("surgeon", "osei", True, False)
        self.check("surgeon", "stranger", True, False)

    def test_admin_everything(self):
        self.check("admin", "osei", True, True)
        self.check("admin", "stranger", True, True)

    def test_anonymous_nothing(self):
        from django.contrib.auth.models import AnonymousUser

        self.assertFalse(can_view_astronaut(AnonymousUser(), self.astronauts["osei"]))

    def test_visible_astronauts(self):
        names = lambda u: set(visible_astronauts(self.users[u]).values_list("call_sign", flat=True))  # noqa: E731
        self.assertEqual(names("osei"), {"Osei"})
        self.assertEqual(names("adjei"), {"Osei", "Mensah", "Adjei"})
        self.assertEqual(names("surgeon"), {"Osei", "Mensah", "Adjei", "Far"})


class BearerHeaderTests(AuthTestBase):
    """Swagger's Authorize box sends `Bearer <key>`; the spec's `Token <key>` must keep working."""

    def test_token_and_bearer_both_work(self):
        key = self.login().json()["token"]
        for keyword in ("Token", "Bearer", "token", "bearer"):
            self.client.credentials(HTTP_AUTHORIZATION=f"{keyword} {key}")
            self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200, keyword)

    def test_bare_key_without_keyword_is_rejected(self):
        key = self.login().json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=key)
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")

    def test_keyword_without_key(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer")
        self.assertErrorCode(self.client.get("/api/v1/auth/me/"), 401, "NOT_AUTHENTICATED")


class UserAdminTests(AuthTestBase):
    URL = "/api/v1/auth/users/"

    def as_user(self, username):
        self.auth(self.login(username).json()["token"])

    def test_only_admin(self):
        for username in ("osei", "adjei", "surgeon"):
            self.as_user(username)
            self.assertErrorCode(self.client.get(self.URL), 403, "PERMISSION_DENIED")
        self.client.credentials()
        self.assertErrorCode(self.client.get(self.URL), 401, "NOT_AUTHENTICATED")

    def test_list_and_filter(self):
        self.as_user("admin")
        self.assertEqual(len(self.client.get(self.URL).json()), 5)
        crew = self.client.get(self.URL, {"role": "CREW"}).json()
        self.assertEqual({u["username"] for u in crew}, {"osei", "mensah"})
        self.assertEqual([u["username"] for u in self.client.get(self.URL, {"search": "boat"}).json()], ["surgeon"])

    def test_create_with_invite_email(self):
        self.as_user("admin")
        new = Astronaut.objects.create(
            mission=self.astronauts["osei"].mission, full_name="Kwame Asante", call_sign="Asante", crew_role="ENGINEER"
        )
        r = self.client.post(self.URL, {
            "username": "asante", "role": "CREW", "astronaut_id": new.pk, "email": "asante@example.com",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["display_name"], "Engineer Kwame Asante")
        self.assertNotIn("password", r.json())
        user = User.objects.get(username="asante")
        self.assertFalse(user.has_usable_password())

        # The invite link sets the password, then they can log in.
        self.assertEqual(mail.outbox[-1].to, ["asante@example.com"])
        uid, token = re.search(r"uid=([\w-]+)&token=([\w-]+)", mail.outbox[-1].body).groups()
        self.client.credentials()
        r = self.client.post("/api/v1/auth/password/reset/confirm/",
                             {"uid": uid, "token": token, "new_password": "asante-chooses-this-1"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.login("asante", "asante-chooses-this-1").status_code, 200)

    def test_create_with_password(self):
        self.as_user("admin")
        r = self.client.post(self.URL, {
            "username": "surgeon2", "role": "FLIGHT_SURGEON", "password": "another-strong-pass-9",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(len(mail.outbox), 0)
        self.client.credentials()
        self.assertEqual(self.login("surgeon2", "another-strong-pass-9").status_code, 200)

    def test_create_rules(self):
        self.as_user("admin")
        cases = [
            ({"username": "a", "role": "CREW", "email": "a@example.com"}, "astronaut_id"),  # crew w/o astronaut
            ({"username": "b", "role": "FLIGHT_SURGEON", "astronaut_id": self.astronauts["stranger"].pk,
              "email": "b@example.com"}, "astronaut_id"),  # surgeon with astronaut
            ({"username": "c", "role": "CREW", "astronaut_id": self.astronauts["osei"].pk,
              "email": "c@example.com"}, "astronaut_id"),  # astronaut already has an account
            ({"username": "d", "role": "ADMIN"}, "email"),  # no password and no email
            ({"username": "e", "role": "ADMIN", "password": "123"}, "password"),  # weak password
            ({"username": "osei", "role": "ADMIN", "email": "x@example.com"}, "username"),  # taken
        ]
        for payload, field in cases:
            r = self.client.post(self.URL, payload, format="json")
            self.assertErrorCode(r, 400, "VALIDATION_ERROR")
            self.assertIn(field, r.json()["error"]["details"], payload)

    def test_edit_role_and_password(self):
        self.as_user("admin")
        mensah = self.users["mensah"]
        self.client.credentials()
        mensah_token = self.login("mensah").json()["token"]
        self.as_user("admin")
        r = self.client.patch(f"{self.URL}{mensah.pk}/",
                              {"role": "MEDICAL_OFFICER", "password": "admin-set-pass-123"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["role"], "MEDICAL_OFFICER")
        self.assertFalse(Token.objects.filter(key=mensah_token).exists())  # logged out

    def test_deactivate_and_reactivate(self):
        self.as_user("admin")
        osei = self.users["osei"]
        self.assertEqual(self.client.delete(f"{self.URL}{osei.pk}/").status_code, 204)
        self.assertTrue(User.objects.filter(pk=osei.pk, is_active=False).exists())  # kept, not deleted
        self.client.credentials()
        self.assertErrorCode(self.login("osei"), 400, "INVALID_CREDENTIALS")
        self.as_user("admin")
        self.client.patch(f"{self.URL}{osei.pk}/", {"is_active": True}, format="json")
        self.client.credentials()
        self.assertEqual(self.login("osei").status_code, 200)

    def test_admin_cannot_lock_self_out(self):
        self.as_user("admin")
        me = self.users["admin"].pk
        self.assertErrorCode(self.client.delete(f"{self.URL}{me}/"), 400, "VALIDATION_ERROR")
        r = self.client.patch(f"{self.URL}{me}/", {"is_active": False}, format="json")
        self.assertErrorCode(r, 400, "VALIDATION_ERROR")
