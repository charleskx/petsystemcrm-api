.DEFAULT_GOAL := help

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
.PHONY: test
test: ## Run all tests
	pnpm exec vitest run

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	pnpm exec vitest

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	pnpm exec vitest run --coverage

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
