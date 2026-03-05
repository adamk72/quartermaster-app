# Treasure Tracker - D&D Campaign Management Webapp

## Overview
Multi-user webapp replacing Google Sheets + Docs for tracking a weekly D&D campaign. Any player can edit anything, with a changelog for accountability.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand 5 + React Router + Lucide React
- **Backend**: Go 1.23 with stdlib `net/http` (Go 1.22+ route patterns)
- **Database**: SQLite via `github.com/mattn/go-sqlite3`
- **Auth**: Invite code + username -> session token (default code: "dragons")
- **Package manager**: pnpm (frontend)

## Project Structure
- `backend/` - Go backend (cmd/server, cmd/seed, cmd/export, internal/api, internal/db, internal/spa)
- `frontend/` - React frontend (src/api, src/stores, src/components, src/pages, src/types)
- `docs/archive/` - Original CSV/text data files
- `data/campaign.db` - SQLite database (gitignored)
- `data/export/` - JSON dumps (git-tracked)
- `uploads/` - Journal images

## Dev Workflow
- `make dev` - Runs both Go backend (`:8080`) + Vite dev server (`:5173`, proxies `/api` -> `:8080`)
- `make seed` - Imports CSV archive data into SQLite
- `make export` / `make restore` - JSON dump/restore
- `make build` - Production build
- `cd frontend && pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck`
- `cd backend && go run ./cmd/server` / `go build ./...` / `go vet ./...`

## API
All endpoints under `/api/v1/`. Auth via `Authorization: Bearer <token>`.
- POST `/auth/login` (public) - `{ username, invite_code }` -> `{ token, user }`
- CRUD: `/characters`, `/containers`, `/items`, `/coins`, `/critters`, `/sessions`, `/quests`, `/xp`, `/skills`, `/watch/schedules`
- GET `/items/summary` - Party coin, net worth, weight, item count
- GET `/coins/balance` - Denomination breakdown
- GET `/xp/totals` - Per-character XP with level calculation
- GET `/changelog` - Paginated change log

## Conventions
- Party members: Andurin, Ayloc, Ruya, Sachan, Ingvild, Hrothgar
- Currency: 1pp = 10gp, 1ep = 0.5gp, 1sp = 0.1gp, 1cp = 0.01gp
- TBI = "to be identified" (unidentified magic items)
- Game dates: M/D for 2025, M/D/YY for 2026
