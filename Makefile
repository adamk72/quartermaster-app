.PHONY: dev dev-backend dev-frontend build seed export restore lint

dev:
	@echo "Starting backend and frontend..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && exec go run ./cmd/server

dev-frontend:
	cd frontend && pnpm dev

build:
	cd frontend && pnpm build
	mkdir -p backend/cmd/server/static
	cp -r frontend/dist/* backend/cmd/server/static/
	cd backend && go build -o ../quartermaster-app ./cmd/server

seed:
	cd backend && go run ./cmd/seed

export:
	cd backend && go run ./cmd/export

restore:
	cd backend && go run ./cmd/export --restore

lint:
	cd frontend && pnpm lint
	cd backend && go vet ./...

typecheck:
	cd frontend && pnpm typecheck
