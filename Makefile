.PHONY: dev dev-backend dev-frontend build prod seed export restore archive lint

# Project-root data paths passed to backend commands (which run from backend/)
ROOT_DATA      = $(CURDIR)/data
DEV_DB         = $(ROOT_DATA)/campaign.db
PROD_DB        = $(ROOT_DATA)/prod/campaign.db
DEV_EXPORT     = $(ROOT_DATA)/export/dev
PROD_EXPORT    = $(ROOT_DATA)/export/prod
MIGRATIONS     = $(CURDIR)/backend/migrations

dev:
	@echo "Starting backend and frontend..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && PORT=9091 DB_PATH=$(DEV_DB) MIGRATIONS_DIR=$(MIGRATIONS) exec go run ./cmd/server

dev-frontend:
	cd frontend && PORT=9091 pnpm dev

build:
	cd frontend && pnpm build
	rm -rf static
	cp -r frontend/dist static
	cd backend && go build -o ../quartermaster-app ./cmd/server

prod: build
	@mkdir -p $(ROOT_DATA)/prod
	DB_PATH=$(PROD_DB) MIGRATIONS_DIR=$(MIGRATIONS) ./quartermaster-app

seed:
	cd backend && DB_PATH=$(DEV_DB) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/seed

export:
	cd backend && DB_PATH=$(DEV_DB) EXPORT_DIR=$(DEV_EXPORT) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/export

restore:
	cd backend && DB_PATH=$(DEV_DB) EXPORT_DIR=$(DEV_EXPORT) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/export --restore

archive:
	./scripts/archive-export.sh dev

prod-seed:
	cd backend && DB_PATH=$(PROD_DB) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/seed

prod-export:
	cd backend && DB_PATH=$(PROD_DB) EXPORT_DIR=$(PROD_EXPORT) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/export

prod-restore:
	cd backend && DB_PATH=$(PROD_DB) EXPORT_DIR=$(PROD_EXPORT) MIGRATIONS_DIR=$(MIGRATIONS) go run ./cmd/export --restore

prod-archive:
	./scripts/archive-export.sh prod

lint:
	cd frontend && pnpm lint
	cd backend && go vet ./...

typecheck:
	cd frontend && pnpm typecheck
