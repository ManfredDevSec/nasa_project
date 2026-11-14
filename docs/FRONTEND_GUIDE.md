# SightLine — Frontend Starter Guide
**For:** the frontend team · **Stack:** React (Vite) + Tailwind + React Router + Recharts
**Backend contract:** `03_API_SPECIFICATION.md` (ask the backend dev for it + the Swagger link `/api/docs/`)

> Goal: reach a **working eye test → result → dashboard** flow first. Everything else is polish.

---

## 1. Setup (30 min)

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom recharts axios
# Tailwind: follow the current "Tailwind + Vite" guide on tailwindcss.com
```
`.env`
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_USE_MOCKS=true
```

**Don't wait for the backend.** Put the example responses from `03_API_SPECIFICATION.md` into `src/mocks/*.json`. In `src/api/client.js`, return mock data when `VITE_USE_MOCKS=true`. Switch to `false` when the backend is live, with no other code changes.

```js
// src/api/client.js
import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Token ${t}`;
  return cfg;
});
export default api;
```

---

## 2. Look & Feel

- Dark background (`bg-slate-950`), white text, **big** buttons (tablet + tired eyes).
- Colours only mean status: 🟢 `#22c55e` GREEN · 🟡 `#f59e0b` AMBER · 🔴 `#ef4444` RED · ⚪ `#64748b` UNKNOWN.
- One `StatusBadge` component used everywhere so colours stay consistent.
- Smooth transitions between test steps (Tailwind `transition`, or `framer-motion` if someone knows it).

---

## 3. Screens & How to Build Them

### 3.1 Login: `/login`
- Username + password form → `POST /auth/login/` → save `token` and `user` to localStorage.
- **Quick-login buttons** for the demo: "Commander Osei", "Pilot Mensah", "Medical Officer Adjei", "Flight Surgeon".
- After login: CREW/MO → `/home`, FLIGHT_SURGEON → `/crew`.

### 3.2 Eye Test: `/test` (the core feature)
Runs **twice, once per eye** (left, then right). Show "Cover your RIGHT eye" before the left-eye steps, and vice versa.
Each step has a small **"Why this test?"** button (1–2 sentences).

**Step A: Near vision (result: line 1–10)**
- 10 lines, font size shrinking, e.g. `[64, 54, 46, 38, 32, 26, 22, 18, 14, 11]` px.
- Show **5 random letters** from `C D H K N O R S V Z` at the current line's size.
- User types what they see. **≥ 4 of 5 correct = pass**, then go to the next (smaller) line.
- Fail → stop. **Score = last line passed** (0 passed → send 1).

**Step B: Amsler grid (result: list of [row, col])**
- 10×10 grid with a dot in the centre. CSS grid, white lines on black.
- Tap a cell → toggles it (highlight in amber). Keep a list of `[row, col]` (0-indexed).
- "All lines look straight" button → empty list.
```jsx
<div className="grid grid-cols-10 w-80 h-80 border border-white relative">
  {cells.map(([r, c]) => (
    <button key={`${r}-${c}`} onClick={() => toggle(r, c)}
      className={`border border-white/60 ${isMarked(r,c) ? "bg-amber-500/60" : ""}`} />
  ))}
  <span className="absolute w-2 h-2 bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
</div>
```

**Step C: Contrast (result: level 1–8)**
- Same letter game, **fixed size** (~40px), but the letter colour fades toward the background each level.
- e.g. text opacity per level: `[1.0, 0.7, 0.5, 0.35, 0.25, 0.17, 0.11, 0.07]`.
- Pass rule same as near vision. **Score = last level passed.**

**Step D: Symptoms (asked once, after both eyes)**
- Three sliders 0–3: Headache, Eye pressure, Blurry vision (labels: None / Mild / Moderate / Severe).

**Submit:** `POST /checks/` with all fields → go to `/result` with the response.

> Tip: put each step in its own component (`NearVisionStep`, `AmslerGrid`, `ContrastStep`, `SymptomSliders`) and keep the collected answers in one state object in `VisionTest.jsx`.

### 3.3 Result: `/result`
- Big status circle (colour + word: ALL CLEAR / WATCH / ACT NOW).
- `reasons` as bullet text, `actions` as a checklist (sorted by priority), `env_insights` (if any) in a small "Possible factors" box.
- If `escalate_to_earth`: banner "A report will be sent to your flight surgeon."
- Small celebration if the streak grows (from `/engagement/`); this is the gamification touch.

### 3.4 Body Map (home): `/home`
Data: `GET /astronauts/{id}/body-map/`.
- Build a **simple SVG figure yourself** (circle head, rectangles for body; no copyrighted art). Each part is a `<g>` you can click:
```jsx
<svg viewBox="0 0 200 400">
  <g onClick={() => open("EYES")} className="cursor-pointer">
    <circle cx="100" cy="50" r="35" fill="#1e293b" stroke={color("EYES")} strokeWidth="4" />
    <circle cx="88" cy="45" r="5" fill={color("EYES")} className="animate-pulse" />
    <circle cx="112" cy="45" r="5" fill={color("EYES")} className="animate-pulse" />
  </g>
  <g onClick={() => open("HEART")}> {/* torso + heart shape */} </g>
  {/* SLEEP / MIND: e.g. a moon icon and a brain icon beside the head */}
</svg>
```
- Clicking a part opens a side card: `summary`, `info.function`, `info.space_effect`, `info.what_to_do`, plus an action button (`action.route`).
- Pulse animation on RED parts.
- Top bar: mission day, streak 🔥, next test due, "Log today's vitals" button (→ simple form → `POST /daily-logs/`).

### 3.5 Trends: `/trends/:id`
Data: `GET /astronauts/{id}/trends/`.
- **Recharts `LineChart`**, x-axis = `mission_day`.
- Lines: near vision left + right. Dashed `ReferenceLine` at baseline.
- Second chart (or second y-axis): cabin CO₂ / other factors, so people can see the drop lines up with the bump.
- Dots coloured by `level`. `events` as vertical `ReferenceLine`s with labels.

### 3.6 Crew Dashboard: `/crew` (Medical Officer & Flight Surgeon)
Data: `GET /crew/overview/`.
- One card per astronaut: name, overall status, 4 mini dots (eyes/heart/sleep/mind), headline. Click → their trends.
- Alerts list at the top (RED first).
- "Weekly Earth Report" button → `/report`.

### 3.7 Earth Report: `/report`
Data: `GET /reports/weekly/`. Clean white printable page + "Print / Save as PDF" (`window.print()`).

### 3.8 Learn: `/learn` (static)
Short cards: What is SANS? · Why test weekly? · The 5 hazards. Text comes from `08_NASA_RESOURCES.md` (ask backend dev); don't invent facts.

---

## 4. Build Order (to reach something significant fast)

| # | Build | With |
|---|---|---|
| 1 | Setup, router, theme, StatusBadge | — |
| 2 | **Eye test flow (A → D)** | local state only |
| 3 | **Result screen** | mock response |
| 4 | **Crew dashboard** | mock |
| 5 | Body map | mock |
| 6 | Trends charts | mock |
| 7 | Login + quick-login | real API |
| 8 | Switch mocks off, connect everything | real API |
| 9 | Report, Learn, vitals form, animations | — |

**Steps 2–4 = a demo-able product.** Do these first.

## 5. Demo Path (practise it)
Quick-login Osei → body map (eyes amber/red) → take test (left eye: read up to line 6, tap 4 grid cells) → RED result with escalation → switch to Medical Officer → crew dashboard → Osei trend chart → Earth report.

## 6. Talk to the Backend Dev When
- A field name or shape in the API doesn't match what you need. **Agree first, don't work around it.**
- You get CORS errors (they need to add your URL to `CORS_ALLOWED_ORIGINS`).
- ⚠️ The "possible factors" (`env_insights`) may change from CO₂/salt to NASA-named factors (mission length, thigh cuffs, B vitamins). Render them generically from `text`, so it won't matter.
