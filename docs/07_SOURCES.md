# 07 — Sources & NASA Resources
**Purpose:** back up every number and claim. Judges check this; it also goes in the README.

> Fill the **Link** column as you find each source (start with the challenge's **Resources** tab). Don't leave a demo number unsourced without saying "demo value".

---

## 1. Where to Look

| Place | What it has | Link |
|---|---|---|
| Challenge **Resources** tab | Official links NASA picked for this challenge (start here) | spaceappschallenge.org → challenge → Resources |
| NASA Human Research Program (HRP) | The 5 hazards, health risks, countermeasures | https://www.nasa.gov/hrp/ |
| Human Research Roadmap | NASA's official risk list, incl. the **SANS risk** and evidence | https://humanresearchroadmap.nasa.gov |
| NASA Technical Reports Server (NTRS) | Research papers (search "SANS", "spaceflight associated neuro-ocular", "ISS carbon dioxide") | https://ntrs.nasa.gov |
| NASA OSDR (Open Science Data Repository) | Open spaceflight biology datasets, if listed in Resources | https://osdr.nasa.gov |

---

## 2. Claims to Source

| Claim / number | Used in | Where to find | Link |
|---|---|---|---|
| SANS exists, is a recognised NASA risk | Pitch, Learn page, body map info | Human Research Roadmap: SANS risk | |
| SANS signs: near-vision change, eye swelling, folds | Learn page, test choice | HRP SANS evidence report | |
| Some changes may persist after flight | Pitch | HRP evidence report / NTRS | |
| Fluid shift toward the head in microgravity | Body map info text | HRP | |
| The 5 hazards (radiation, isolation, distance, gravity, closed environment) | Learn page | HRP / challenge text | |
| ISS cabin CO₂ is higher than on Earth; typical values | Seed CO₂ numbers (`CO2_NORMAL_MMHG`) | NTRS papers on ISS CO₂ | |
| CO₂ / sodium / exercise as **suspected** SANS factors | Env insights | HRP evidence report | |
| Mars comms delay ~3–22 min one way | Pitch | NASA mission pages | |
| Amsler grid / near acuity / contrast tests are standard vision screens | Test design | Medical reference | |
| Vitals ranges (HR, BP, sleep) | `vitals_rules.py` | Medical guideline / HRP | |

---

## 3. Demo Values (say so honestly)

These are **ours**, not NASA's:
- All eye drift thresholds (1 / 2 lines, 1 / 2 contrast levels)
- Symptom score cut-offs (3 / 6)
- Gravity strictness multipliers
- CO₂ "high" cut-off of 3.5 mmHg and the 3-of-7-days trigger
- All seed crew data (simulated)

Pitch line: "Thresholds are demo values; in a real system they'd be set with NASA flight surgeons using the HRP evidence."
