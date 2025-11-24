.PHONY: up

up: ## Start all services (Ctrl+C to stop and clean up)
	docker compose up --build --watch; docker compose down
