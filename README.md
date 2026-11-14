# SightLine

NASA Space Apps hackathon project — tracking astronaut vision health for Space Associated Neuro-ocular Syndrome (SANS).

## Quick start

**Prerequisites:** Docker Desktop, `make`. On Windows use WSL or Git Bash.

```bash
make fresh
```

That builds images, starts services, and seeds initial data in one step.

## URLs

| Service | URL |
|---------|-----|
| API | http://localhost:8000/api |
| Admin | http://localhost:8000/admin |
| API docs | http://localhost:8000/api/docs |
| Frontend app | http://localhost:5173 (when frontend profile is active) |

## Common commands

| Command | Description |
|---------|-------------|
| `make up` | Start services (detached) |
| `make down` | Stop and remove containers |
| `make logs` | Follow all logs |
| `make logs-backend` | Follow backend logs only |
| `make migrate` | Run database migrations |
| `make makemigrations` | Create new migrations |
| `make seed` | Seed mission data |
| `make test` | Run all tests |
| `make test app=scoring` | Run tests for a specific app |
| `make shell` | Open Django shell |
| `make bash` | Open bash in backend container |
| `make superuser` | Create a Django superuser |
| `make reset-db` | Wipe and recreate the database |
| `make fresh` | Full rebuild + seed (new teammate onboarding) |

> **Note:** The `seed` command (`python manage.py seed_mission`) will be added in a later step.
