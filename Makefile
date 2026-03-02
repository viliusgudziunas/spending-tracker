.PHONY: up lint lint-backend lint-frontend db-autogenerate db-upgrade db-downgrade-1

up: ## Start all services (Ctrl+C to stop and clean up)
	docker compose up --build --watch; docker compose down

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Run backend linters (ruff)
	@echo "🔍 Backend linter"
	@EXIT_CODE=0; \
	cd backend && \
	poetry run ruff check --fix || EXIT_CODE=$$?; \
	poetry run ruff format || EXIT_CODE=$$?; \
	exit $$EXIT_CODE

lint-frontend: ## Run frontend linters (eslint + prettier)
	@echo "🔍 Frontend linter"
	@EXIT_CODE=0; \
	cd frontend && \
	npx eslint --fix . || EXIT_CODE=$$?; \
	npx prettier --write src/ || EXIT_CODE=$$?; \
	exit $$EXIT_CODE

db-autogenerate: ## Auto-generate alembic migration (usage: make db-autogenerate msg="migration message")
	cd backend && poetry run alembic revision --autogenerate -m "$(msg)"

db-upgrade: ## Upgrade database to latest migration
	cd backend && poetry run alembic upgrade head

db-downgrade-1: ## Downgrade database by one migration
	cd backend && poetry run alembic downgrade -1
