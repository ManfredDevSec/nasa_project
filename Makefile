COMPOSE := docker compose
FRONTEND := $(shell [ -f frontend/package.json ] && echo "--profile frontend" || echo "")

.DEFAULT_GOAL := help

.PHONY: help build up down restart logs logs-backend migrate makemigrations collectstatic seed test shell bash superuser reset-db fresh

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Build all images
	$(COMPOSE) $(FRONTEND) build

up: ## Start services and wait until the backend is ready (migrations done)
	$(COMPOSE) $(FRONTEND) up -d --wait
	@echo ""
	@echo "  API     http://localhost:8000/api/v1/"
	@echo "  Admin   http://localhost:8000/admin"
	@echo "  Docs    http://localhost:8000/api/docs"
	$(if $(FRONTEND),@echo "  App     http://localhost:5173",)

down: ## Stop and remove containers
	$(COMPOSE) $(FRONTEND) down

restart: ## Restart all services
	$(COMPOSE) $(FRONTEND) restart

logs: ## Follow logs from all services
	$(COMPOSE) $(FRONTEND) logs -f

logs-backend: ## Follow backend logs
	$(COMPOSE) logs -f backend

migrate: ## Run database migrations
	$(COMPOSE) exec backend python manage.py migrate

makemigrations: ## Create new migrations
	$(COMPOSE) exec backend python manage.py makemigrations

collectstatic: ## Collect static files
	$(COMPOSE) exec backend python manage.py collectstatic --noinput

seed: ## Seed demo data (seed_mission returns in task T8)
	$(COMPOSE) exec backend python manage.py seed_mission

test: ## Run tests (use app=<name> to target an app)
	$(COMPOSE) exec backend python manage.py test $(app)

shell: ## Open Django shell
	$(COMPOSE) exec backend python manage.py shell

bash: ## Open bash in backend container
	$(COMPOSE) exec backend bash

superuser: ## Create a Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

reset-db: ## Destroy the database volume and start fresh (migrations run on start)
	@printf "This will delete all data. Continue? [y/N] " && read ans && [ "$${ans}" = "y" ]
	$(COMPOSE) $(FRONTEND) down -v
	$(COMPOSE) $(FRONTEND) up -d --wait

frontend-deps: ## Reinstall frontend packages inside the container (run after npm install)
	docker compose --profile frontend up -d --build --renew-anon-volumes frontend

fresh: build up ## One-command setup for new teammates (build → up; seed is added back in T8)
