# SightLine Backend: Instructions for Claude Code

Project: SightLine, astronaut eye-health (SANS) + basic vitals self-assessment tool.
NASA Space Apps Challenge 2026. Hackathon: build fast, keep it simple, keep it working.

## My part
Backend only: Django REST API. The frontend (React) is built by a teammate and talks to this API.

## Spec files (in `docs/`), read before working
1. `docs/01_SETUP_AND_CONVENTIONS.md`: stack, structure, settings, coding rules (always follow)
2. `docs/02_DATABASE_SCHEMA.md`: models
3. `docs/03_API_SPECIFICATION.md`: endpoints (this is the contract with the frontend; don't change shapes without telling me)
4. `docs/04_SCORING_RULES.md`: scoring logic and test cases
5. `docs/05_SEED_DATA_SPEC.md`: demo data story
6. `docs/06_BACKEND_TASKS.md`: build order (T1 → T13)
7. `docs/07_SOURCES.md` and `docs/08_NASA_RESOURCES.md`: facts and sources

## Rules
- Work **one task from 06 at a time**. After each task: run it, check its "Done when" list, tell me the result, then stop and wait.
- Explain what you did in **simple terms**. I'm not an expert in every part of this.
- Never invent NASA facts or numbers. Use only `08_NASA_RESOURCES.md`; otherwise mark as "demo value".
- All thresholds go in `scoring/config.py`.
- Never commit `.env`. Use `.env.example`.
- My laptop runs **Fedora Linux**.
- Database: PostgreSQL on **Neon**. Hosting: **Render**.
- If a spec is unclear or two specs disagree, ask me before guessing.
