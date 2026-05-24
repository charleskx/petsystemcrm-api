.DEFAULT_GOAL := help

# Load .env if present (makes DATABASE_URL and other vars available to make targets)
ifneq (,$(wildcard .env))
  include .env
  export
endif

# ── Variables ───────────────────────────────────────────────────────────────
IMAGE_NAME := petsystemcrm-api
COMPOSE_DEV := docker compose -f docker-compose.dev.yml

# ── Help ────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ─────────────────────────────────────────────────────────────
.PHONY: dev
dev: ## Start development server in watch mode
	pnpm run dev

.PHONY: dev-infra
dev-infra: ## Start local infrastructure (postgres + pgadmin)
	$(COMPOSE_DEV) up -d

.PHONY: dev-infra-down
dev-infra-down: ## Stop local infrastructure
	$(COMPOSE_DEV) down

.PHONY: dev-infra-reset
dev-infra-reset: ## Stop local infrastructure and delete volumes
	$(COMPOSE_DEV) down -v

# ── Build ────────────────────────────────────────────────────────────────────
.PHONY: build
build: ## Build for production
	pnpm run build

# ── Database ─────────────────────────────────────────────────────────────────
.PHONY: migrate
migrate: ## Run pending migrations (drizzle-kit)
	pnpm exec drizzle-kit migrate

.PHONY: migrate-gen
migrate-gen: ## Generate a new migration from schema changes
	pnpm exec drizzle-kit generate

.PHONY: migrate-drop
migrate-drop: ## Drop the last migration (use with caution)
	pnpm exec drizzle-kit drop

.PHONY: db-studio
db-studio: ## Open Drizzle Studio in the browser
	pnpm exec drizzle-kit studio

# ── Quality ──────────────────────────────────────────────────────────────────
.PHONY: lint
lint: ## Run Biome linter
	pnpm exec biome check .

.PHONY: lint-fix
lint-fix: ## Run Biome linter and apply safe fixes
	pnpm exec biome check --write .

.PHONY: format
format: ## Format code with Biome
	pnpm exec biome format --write .

.PHONY: typecheck
typecheck: ## Run TypeScript type checker
	pnpm exec tsc --noEmit

.PHONY: check
check: lint typecheck ## Run linter + type checker together

# ── Tests ────────────────────────────────────────────────────────────────────
# Tests run inside the Docker app container (Node LTS) to avoid host Node version constraints.
# The first run installs deps inside the container; subsequent runs reuse the named volume cache.
COMPOSE_APP := $(COMPOSE_DEV) --profile app

.PHONY: test-db
test-db: ## Ensure petsystemcrm_test DB exists and is migrated (uses postgres container)
	$(COMPOSE_DEV) exec postgres psql -U postgres -c "CREATE DATABASE petsystemcrm_test" 2>/dev/null || true
	$(COMPOSE_APP) up -d app
	$(COMPOSE_APP) exec app sh -c "corepack enable && pnpm install --frozen-lockfile --silent"
	$(COMPOSE_APP) exec app pnpm exec drizzle-kit migrate

.PHONY: test
test: ## Run all tests inside Docker (Node LTS)
	$(COMPOSE_APP) up -d app
	$(COMPOSE_APP) exec app sh -c "corepack enable && pnpm install --frozen-lockfile --silent"
	$(COMPOSE_DEV) exec postgres psql -U postgres -c "CREATE DATABASE petsystemcrm_test" 2>/dev/null || true
	$(COMPOSE_APP) exec app pnpm exec drizzle-kit migrate
	$(COMPOSE_APP) exec app pnpm exec vitest run

.PHONY: test-watch
test-watch: ## Run tests in watch mode inside Docker
	$(COMPOSE_APP) up -d app
	$(COMPOSE_APP) exec app pnpm exec vitest

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report inside Docker
	$(COMPOSE_APP) up -d app
	$(COMPOSE_APP) exec app pnpm exec vitest run --coverage

# ── Docker ───────────────────────────────────────────────────────────────────
.PHONY: docker-build
docker-build: ## Build production Docker image
	docker build -t $(IMAGE_NAME) .

.PHONY: docker-run
docker-run: ## Run production Docker image locally
	docker run --env-file .env -p 3333:3333 $(IMAGE_NAME)

# ── OpenSpec ─────────────────────────────────────────────────────────────────
# /opsx:propose, /opsx:apply, /opsx:verify are Claude Code slash commands — use them inside Claude Code, not here.
.PHONY: spec-init
spec-init: ## OpenSpec: initialize spec structure in the project (run once)
	pnpm exec openspec init

.PHONY: spec-update
spec-update: ## OpenSpec: update OpenSpec to latest version
	pnpm exec openspec update
