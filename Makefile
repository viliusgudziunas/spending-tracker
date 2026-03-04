.PHONY: up lint lint-backend lint-frontend test test-unit test-integration db-autogenerate db-upgrade db-downgrade-1

up: ## Start all services (Ctrl+C to stop and clean up)
	docker compose up --build --watch; docker compose down

lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Run backend linters (ruff + ty)
	@echo "🔍 Backend linter"
	@EXIT_CODE=0; \
	cd backend && \
	poetry run ruff check --fix || EXIT_CODE=$$?; \
	poetry run ruff format || EXIT_CODE=$$?; \
	poetry run ty check || EXIT_CODE=$$?; \
	exit $$EXIT_CODE

lint-frontend: ## Run frontend linters (eslint + prettier)
	@echo "🔍 Frontend linter"
	@EXIT_CODE=0; \
	cd frontend && \
	npx eslint --fix --max-warnings 0 . || EXIT_CODE=$$?; \
	npx prettier --write src/ || EXIT_CODE=$$?; \
	exit $$EXIT_CODE

test: ## Run all backend tests
	cd backend && poetry run pytest

test-unit: ## Run backend unit tests
	cd backend && poetry run pytest -m unit

test-integration: ## Run backend integration tests
	cd backend && poetry run pytest -m integration

db-autogenerate: ## Auto-generate alembic migration (usage: make db-autogenerate msg="migration message")
	cd backend && poetry run alembic revision --autogenerate -m "$(msg)"

db-upgrade: ## Upgrade database to latest migration
	cd backend && poetry run alembic upgrade head

db-downgrade-1: ## Downgrade database by one migration
	cd backend && poetry run alembic downgrade -1
