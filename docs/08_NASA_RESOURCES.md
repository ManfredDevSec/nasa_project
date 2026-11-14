# 08 — NASA Resources (for AI use)

## RULES FOR THE AI (read first)
1. Use **only** the facts written in this file when writing health text, explanations, or comments that cite NASA.
2. **Never invent** facts, numbers, or quotes and attribute them to NASA. If a fact isn't here, write it as a "demo value" or leave a `# TODO: source needed` comment.
3. Do not call or fetch these URLs from code. They are **reading sources**, not APIs.
4. When you use a fact in code or text, add a source comment, e.g. `# Source: NASA HRP: SANS risk page`.

Facts below were taken from the pages on 14 Nov 2026. Quotes are exact; other lines are summaries.

---

## R1. Risks of Human Spaceflight (HRP)
**URL:** https://www.nasa.gov/hrp/risks/
**Use for:** Learn page, body map info cards, problem statement in README/pitch.

Facts:
- NASA HRP lists **17 risks** in 3 groups: Human Physiology (11), Behavioral Performance & Human Factors (5), Space Radiation (1).
- SANS is one of them: "Spaceflight Associated Neuro-ocular Syndrome (SANS)": changes to eye and brain structure.
- The page states the earlier name, Visual Impairment Intracranial Pressure (VIIP) Syndrome, was identified in **2005** and is "currently NASA's leading spaceflight-related health risk."
- Other risks relevant to our body map:
  - **Cardiovascular Adaptations**: weightlessness changes circulation and heart/blood vessel function. → HEART part
  - **Inadequate Sleep and Irregular Schedules**: chronic sleep loss, constant workload, disrupted body clocks. → SLEEP part
  - **Behavioral Changes and Psychiatric Disorders**: isolation, radiation and distance from Earth may affect mental health. → MIND part

Detail links (body map "read more"):
- SANS: https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/
- Cardiovascular: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- Sleep: https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
- Behavioral: https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/

---

## R2. SANS Risk Page (most important source)
**URL:** https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/
**Use for:** EYES info card, Learn page, scoring explanation text, pitch.

Facts:
- Cause (proposed): weightlessness causes "bodily fluids such as blood and cerebrospinal fluid to move toward the head."
- Findings: optic nerve swelling, folds in the retina, flattening of the back of the eye, swelling in the brain.
- Prevalence: "Approximately 70 percent of astronauts aboard the International Space Station" have some swelling in the back of the eyes.
- Severity varies: "Some astronauts only experience mild changes in space, while others have clinically significant outcomes."
- Duration matters: "The risk of developing SANS is higher during longer-duration missions."
- More common in men than women (per page image caption).
- Long-term effect: "The long-term health outcome from these changes is unknown."
- Monitoring in space shown: fundoscope (retina exam).
- Countermeasures under study: nutritional supplements and mechanical methods to reverse headward fluid shift.

**Not on this page:** CO₂, salt/sodium or exercise as SANS risk factors; Amsler grid or vision-chart tests.

---

## R3. 5 Hazards of Human Spaceflight (HRP)
**URL:** https://www.nasa.gov/hrp/hazards/
**Use for:** Learn page, pitch ("SightLine addresses hazards #3, #4, #5").

Facts:
1. **Space Radiation**: "considered one of the most hazardous aspects of spaceflight."
2. **Isolation and Confinement**: missions can last "months or years"; crews need selection, training, support.
3. **Distance from Earth**: help and medical care get harder to receive; Mars is ~140 million miles away on average; a Mars mission ~3 years. Planning and **self-sufficiency** are key. → *our "self-assessment without Earth" angle*
4. **Gravity Fields**: bodies must adjust to different gravity; on Mars, three-eighths (0.375) of Earth's gravity for up to two years. → *our `gravity_g` setting (use 0.38 for Mars)*
5. **Hostile/Closed Environments**: spacecraft is home + machine; temperature, pressure, lighting, noise, microbes. → *our CabinLog*
- Hazards "feed off one another and exacerbate effects on the human body."

---

## R4. Ongoing HRP Research
**URL:** https://www.nasa.gov/hrp/ongoing-hrp-research/
**Use for:** guidance/action text ("NASA is testing…"), pitch credibility, future features.

SANS-related studies:
- **Thigh Cuff** (https://www.nasa.gov/reference/thigh-cuff/): tests whether tight thigh cuffs keep fluid in the legs and reduce headward shift to help prevent SANS. Page: "SANS develops as body fluids shift toward the head in the absence of gravity." Crew wear cuffs for 6 hours in two sessions; vision and blood flow are recorded.
- **B-Complex** (https://www.nasa.gov/reference/b-complex/): tests whether a daily B-vitamin supplement can prevent or reduce eye swelling from SANS; also looks at genetics. Notes OCT (Optical Coherence Tomography) can help identify SANS.
- **Brain Fluid Pressure** (https://www.nasa.gov/reference/brain-fluid-pressure/): pressure inside the skull vs eye/brain changes.
- **Spinal Fluid Biomarkers** (https://www.nasa.gov/reference/spinal-fluid-biomarkers/): markers linked to brain and eye changes.

Health-monitoring studies (show NASA does what we do):
- **Standard Measures**: consistent physiological and psychological measures from crew.
- **ARCHeR** (Artemis II): tracks well-being, activity and sleep.
- **Tempus Pro**: telemedicine device for collecting health data and remote diagnosis.

Rule: describe these as **"being studied by NASA"**, never as proven treatments.

---

## R5. CSA: Monitoring Radiation for Astronaut Health (optional)
**URL:** https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
**Use for:** pitch "future module" only. **Not in backend scope.**

Summary: CSA funds the Canadian Active Neutron Spectrometer (CANS), a compact instrument that measures neutron radiation continuously and autonomously. Neutrons make up about 30% of radiation on the ISS.

---

## Where each fact is used in the backend

| File | What to use |
|---|---|
| `reports/content.py` | EYES/HEART/SLEEP/MIND info cards: `function`, `space_effect`, `what_to_do` from R1, R2, R3 |
| `scoring/config.py` | `MARS gravity_g = 0.38` (R3). All other thresholds = demo values |
| `scoring/engine.py` reasons/actions | Plain text only; may mention fluid shift (R2) |
| `05_SEED_DATA_SPEC` | Mission duration framing (R2: longer missions → higher risk) |
| README "Sources" | All URLs above |

## ⚠️ Known gap
NASA's provided pages do **not** link CO₂ or salt to SANS. Our CO₂/salt insights are a **hypothesis feature**: label them in the UI/reasons as "pattern found, not a proven cause", or replace them with factors NASA does name (mission duration, fluid-shift countermeasures like thigh cuffs, B-vitamin supplements).
