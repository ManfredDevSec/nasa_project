# Frontend ↔ API notes (what's live, what changed)

**For:** the frontend team · **Date:** 14 Nov 2026 · **Backend status:** T1 + T2 done (auth is live)

Read this **next to** `FRONTEND_GUIDE.md` (how to build the screens) and `03_API_SPECIFICATION.md`
(exact request/response shapes). This file covers what was **added or decided** since those were written,
and how to wire the real API in.

---

## 1. What's live right now

| Area | Status | Use |
|---|---|---|
| Login, logout, current user | ✅ live | **Real API** |
| Forgot / change password, edit profile | ✅ live | **Real API** |
| User management (admin) | ✅ live | Optional screen |
| Mission, crew list/detail, baseline, eye test submit + history, daily logs, cabin logs | ✅ live (T7) | **Real API** |
| Body map (`/astronauts/{id}/body-map/`) | ✅ live (T9) | **Real API** |
| Trends, engagement | ⏳ T10 | **Keep mocks** |
| Crew overview, weekly Earth report | ⏳ T11 | **Keep mocks** |
| Demo logins (12 astronauts + surgeon + admin) | ✅ T8 seed | See §8 |

So: **auth, the T7 areas and the body map use the real API now; trends, engagement, crew overview and the
weekly report stay on mocks** until we tell you they're live.
`FRONTEND_GUIDE.md` §1 describes one `VITE_USE_MOCKS` switch for everything; see §7 for doing it per area.

**Running the backend locally:** in the repo root, `make fresh` (Docker), then open
http://localhost:8000/api/docs/ (Swagger: every endpoint, with "Try it out"). A deployed URL comes with T12.

```
VITE_API_URL=http://localhost:8000/api/v1
```
CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`. If you use another port, tell the backend.

---

## 2. Every error looks the same

Any non-2xx response has this body:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "details": { "new_password": ["This password is too short. It must contain at least 8 characters."] }
  }
}
```
- Show `message` as the general error.
- For forms, `details` maps **field name → list of messages**. Show the first one under that field.
  Errors not tied to one field come as `details.non_field_errors`.
- `details` is always present (`{}` when empty).

| HTTP | `code` | When | What the UI should do |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | bad/missing fields | show field messages |
| 400 | `INVALID_CREDENTIALS` | wrong username/password, or account disabled | "Wrong username or password." |
| 401 | `NOT_AUTHENTICATED` | no token, bad token, **expired token** | clear token → go to `/login` |
| 403 | `PERMISSION_DENIED` | role not allowed (e.g. crew opening another astronaut) | "You don't have access" |
| 404 | `NOT_FOUND` | wrong URL or id | not-found state |
| 409 | `NO_BASELINE` | eye test before baseline tests (comes with T6/T7) | "Do your baseline tests first" |
| 429 | `THROTTLED` | too many login/password attempts | "Too many attempts. Wait a minute." |
| 500 | `SERVER_ERROR` | backend bug | generic "Something went wrong" |

---

## 3. API client (drop-in for `src/api/client.js`)

Same idea as `FRONTEND_GUIDE.md`, plus **401 handling** and **one error shape** for the whole app.

```js
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Token ${token}`;
  return cfg;
});

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    Object.assign(this, { status, code, details });
  }
  field(name) {            // first message for a form field, or undefined
    return this.details?.[name]?.[0];
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status ?? 0;
    const body = err.response?.data?.error;

    // Expired / invalid token: log out. (Not for the login call itself.)
    if (status === 401 && !err.config?.url?.includes("/auth/login/")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login?expired=1");
    }

    return Promise.reject(new ApiError({
      status,
      code: body?.code ?? (status ? "UNKNOWN" : "NETWORK_ERROR"),
      message: body?.message ?? (status ? "Something went wrong." : "Can't reach the server."),
      details: body?.details ?? {},
    }));
  }
);

export default api;
```
Use it like:
```js
try {
  await api.post("/auth/password/change/", form);
} catch (e) {
  setErrors({ old: e.field("old_password"), new: e.field("new_password"), general: e.message });
}
```
On `/login?expired=1`, show "Your session expired. Please log in again."

---

## 4. Auth endpoints (all under `/api/v1/auth/`)

### Login: `POST login/`
```json
{ "username": "osei", "password": "..." }
```
200:
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 2, "username": "osei", "role": "CREW", "display_name": "Cmdr. Ama Osei",
    "astronaut_id": 1, "email": "osei@example.com", "first_name": "Ama", "last_name": "Osei"
  }
}
```
Save `token` and `user` (localStorage). Then route by role (as in the guide): `CREW` / `MEDICAL_OFFICER`
→ `/home`; `FLIGHT_SURGEON` → `/crew`; `ADMIN` → `/crew` (suggested, see §9).
- `astronaut_id` is **null** for flight surgeons and admins. Don't build "my body map" links for them.
- **New fields** vs the original spec: `email`, `first_name`, `last_name`.
- Errors: 400 `INVALID_CREDENTIALS`, 400 `VALIDATION_ERROR` (empty fields), 429 `THROTTLED`.

**Tokens expire after 7 days.** Your 401 handler covers this; nothing else to do.

### Logout: `POST logout/`
**204 with no body** (don't parse JSON). Then clear localStorage and go to `/login`.
The token stops working on every device.

### Current user: `GET me/`
Same `user` object as login. Good for refreshing the stored user on app start.

### Edit profile: `PATCH me/`
Send any of `email`, `first_name`, `last_name`. 200 → updated `user` (save it). Other fields are ignored.

### Change password: `POST password/change/`
```json
{ "old_password": "...", "new_password": "..." }
```
200 → `{ "token": "<NEW token>" }`. **Replace the stored token with this one**; the old token is dead
immediately. 400 with `details.old_password` (wrong current password) or `details.new_password` (too weak).

**Password rules** (server checks them; showing them as a hint is nice): at least 8 characters, not a common
password, not only numbers, not too similar to the username/name/email.

---

## 5. Forgot password + invites (needs 2 small screens)

```
Login page                /forgot-password                    email inbox               /reset-password?uid=..&token=..
"Forgot password?" ──►  [ email ] → POST password/reset/  ──►  link in email  ──►  [ new password ] → POST password/reset/confirm/
                                                                                             └─► success → /login
```

**Screen 1: `/forgot-password`.** `POST password/reset/` with `{ "email": "..." }`.
It **always returns 200** with the same message, even if no account has that email (so nobody can probe
emails). Show the `detail` text from the response, e.g. "If an account uses that email, we sent a link…".

**Screen 2: `/reset-password`.** The email link opens **this route on the frontend** (the backend builds it
as `FRONTEND_URL/reset-password?uid=...&token=...`; locally `FRONTEND_URL` = `http://localhost:5173`).
```jsx
import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/auth/password/reset/confirm/", {
        uid: params.get("uid"), token: params.get("token"), new_password: password,
      });
      navigate("/login?reset=1");                      // "Password set. Please log in."
    } catch (err) {
      if (err.field("token")) setError("expired");     // link used or older than 1 hour
      else setError(err.field("new_password") ?? err.message);
    }
  }

  if (error === "expired")
    return <p>This link has expired. <Link to="/forgot-password">Send a new one</Link>.</p>;
  // ...form with one password field + {error}
}
```
- Links work **once** and expire after **1 hour**.
- The **same page** is used for **new-account invites** (an admin creates an account → the user gets an
  email with this link to choose their first password). So word the heading neutrally: "Choose a new password".
- Locally no real email is sent: the email (with the link) **prints in the backend logs**
  (`make logs-backend`). Copy the link from there to test.

---

## 6. Optional: admin user management

Only for `role: "ADMIN"`; everyone else gets 403. The Django admin (`/admin`) already does this, so build
it only if you have time.

| Call | Does |
|---|---|
| `GET users/?role=CREW&is_active=true&search=ose` | list (all filters optional) |
| `POST users/` | create: `username`, `role`, `astronaut_id` (CREW/MO need one; FLIGHT_SURGEON must not), `email`, names, optional `password` |
| `GET users/{id}/` | one user |
| `PATCH users/{id}/` | edit anything, incl. `is_active` and `password` |
| `DELETE users/{id}/` | **deactivates** (204). Re-enable with PATCH `{ "is_active": true }` |

Leave `password` out on create → the user is emailed an invite (§5). User objects here also have
`is_active`, `last_login`, `date_joined`.

---

## 7. Mocks: switch per area, not all at once

Auth is live but nothing else is yet, so don't use one global switch. For example:
```js
// src/api/mode.js
const live = (import.meta.env.VITE_LIVE_AREAS ?? "auth").split(",");   // e.g. "auth,crew,checks"
export const isLive = (area) => live.includes(area);
```
```js
// src/api/crew.js
import api from "./client";
import { isLive } from "./mode";
import crewMock from "../mocks/astronauts.json";

export const getCrew = async () => (isLive("crew") ? (await api.get("/astronauts/")).data : crewMock);
```
When we announce "crew is live", you add `crew` to `VITE_LIVE_AREAS` and nothing else changes.
Mock files should keep the **exact shapes from spec 03**, so the switch is painless.

---

## 8. Demo accounts

`seed_mission` creates these (password `sightline-demo` locally; ask the backend for the live one):

| Username | Role | Use it to show |
|---|---|---|
| `osei` | CREW, Ares Transit 1 | the RED case; her day-92 eye test is left for the live demo |
| `mensah`, `asante`, `appiah` | CREW | healthy (GREEN) crew |
| `owusu` | CREW | an AMBER "watch" status |
| `adjei` | MEDICAL_OFFICER, Ares Transit 1 | the crew dashboard |
| `surgeon` | FLIGHT_SURGEON | read-only Earth view of everyone |
| `admin` | ADMIN | everything |
| `frimpong`, `agyeman`, `quaye` / `bonsu`, `sarpong`, `tetteh` | Moon base / space station crews (finished missions) | history on other missions |

Quick-login buttons: Commander Osei (`osei`), Medical Officer Adjei (`adjei`), Flight Surgeon (`surgeon`).

---

## 9. Who sees which screens (one app, role-based navigation)

Not four apps. There are two views: an **astronaut view** (my body, my test, my trends) and a
**mission-control view** (whole crew, alerts, Earth report). The **Medical Officer** is an astronaut with
medical duty, so they get **both**. Read the role from the stored `user.role`.

| Screen | CREW | MEDICAL_OFFICER | FLIGHT_SURGEON | ADMIN |
|---|---|---|---|---|
| Landing page after login | `/home` | `/home` | `/crew` | `/crew` (suggested) |
| `/home` body map (own) | ✅ | ✅ | — (no astronaut) | — (no astronaut) |
| `/test` eye test → `/result` | ✅ own | ✅ own (API also allows crew members) | — read-only | ✅ |
| Log today's vitals | ✅ own | ✅ | — | ✅ |
| `/trends/:id` | **own only** | whole crew | everyone | everyone |
| `/crew` crew dashboard + alerts | — | ✅ | ✅ | ✅ |
| `/report` weekly Earth report | — | ✅ | ✅ | ✅ |
| Log cabin CO₂ | — | ✅ | — | ✅ |
| `/learn` | ✅ | ✅ | ✅ | ✅ |
| Forgot / change password, profile | ✅ | ✅ | ✅ | ✅ |
| User management (optional, §6) | — | — | — | ✅ |

In short: **Crew** = own health only · **Medical Officer** = own health + crew dashboard, everyone's trends,
report · **Flight Surgeon** = dashboard, trends, report, **read-only** · **Admin** = everything.

A small helper keeps the menu and route guards in one place:
```js
// src/lib/roles.js
const ASTRONAUT = ["CREW", "MEDICAL_OFFICER"];
const MISSION_CONTROL = ["MEDICAL_OFFICER", "FLIGHT_SURGEON", "ADMIN"];

export const landingPage = (role) => (ASTRONAUT.includes(role) ? "/home" : "/crew");

export const can = {
  ownHealth: (u) => ASTRONAUT.includes(u.role) && u.astronaut_id != null, // /home, /test, vitals
  crewDashboard: (u) => MISSION_CONTROL.includes(u.role),                  // /crew, /report
  viewTrends: (u, astronautId) =>
    MISSION_CONTROL.includes(u.role) || u.astronaut_id === Number(astronautId),
  logCabinCO2: (u) => ["MEDICAL_OFFICER", "ADMIN"].includes(u.role),
  manageUsers: (u) => u.role === "ADMIN",
};
```
Use `can.*` to hide menu items and to guard routes (redirect to `landingPage(role)` if not allowed).

**Hiding screens is for a clean experience, not security.** The backend enforces the same rules: a crew member
opening another astronaut or `/crew` gets **403 `PERMISSION_DENIED`**. A missed check in the frontend can't
leak data; the user just sees an error.

---

## 10. Still to agree on

| Question | Default if we don't hear back |
|---|---|
| Route of the "Log today's vitals" form (body map buttons link to it) | `/vitals` |
| Where an **ADMIN** lands in the app (not in the original guide) | `/crew`; admins manage people in Django `/admin` |
| A **cabin CO₂ entry form** for the Medical Officer (API E1 exists, guide has no screen) | Skip for the demo: the seed provides CO₂ data; `/admin` works for manual entry |
| Body-map cards: NASA "Read more" link | ✅ Decided: each part now has `read_more_url` (and `guidance`), see spec 03 R1 |
| Frontend production URL (for CORS + password-reset links) | needed for deploy (T12) |

If any API field name or shape doesn't fit what you need: **tell us first, don't work around it.**
Spec 03 is the contract, and we update it when we change something.
