.PHONY: up lint db-autogenerate db-upgrade

up: ## Start all services (Ctrl+C to stop and clean up)
	docker compose up --build --watch; docker compose down

lint: ## Run backend linter
	@echo "🔍 Backend linter"
	@EXIT_CODE=0; \
	cd backend && \
	poetry run ruff check --fix || EXIT_CODE=$$?; \
	poetry run ruff format || EXIT_CODE=$$?; \
	exit $$EXIT_CODE

db-autogenerate: ## Auto-generate alembic migration (usage: make db-autogenerate msg="migration message")
	cd backend && poetry run alembic revision --autogenerate -m "$(msg)"

db-upgrade: ## Upgrade database to latest migration
	cd backend && poetry run alembic upgrade head
