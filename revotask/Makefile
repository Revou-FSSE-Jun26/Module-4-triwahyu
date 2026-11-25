.PHONY: up down test lint openapi migrate specs gates e2e

up:
	docker compose up -d

down:
	docker compose down

test:
	cd backend && pytest -v
	cd frontend && npm test

lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npm run typecheck

openapi:
	python scripts/export_openapi.py

migrate:
	cd backend && flask --app app:create_app db upgrade

# Regenerate the published /specs folder from .kiro/specs
specs:
	python scripts/build_specs.py

# Repository gates, also run in CI
gates:
	python scripts/check_guidelines.py
	python scripts/check_traceability.py
	python scripts/build_specs.py --check
	python scripts/export_openapi.py --check
	python scripts/check_encoding.py

e2e:
	cd frontend && npx playwright test
