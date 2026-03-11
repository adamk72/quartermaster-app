# Quartermaster App - D&D Campaign Management Webapp

## Overview
Multi-user webapp replacing Google Sheets + Docs for tracking a weekly D&D campaign. Any player can edit anything, with a changelog for accountability.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand 5 + React Router + Lucide React
- **Backend**: Go 1.23 with stdlib `net/http` (Go 1.22+ route patterns)
- **Database**: SQLite via `github.com/mattn/go-sqlite3`
- **Auth**: Invite code + username -> session token. Invite code stored in `settings` table (seeded from `INVITE_CODE` env var, default "dragons"), editable from Settings page.
- **Package manager**: pnpm (frontend)

## Project Structure
- `backend/` - Go backend (cmd/server, cmd/seed, cmd/export, internal/api, internal/db, internal/spa)
- `frontend/` - React frontend (src/api, src/stores, src/components, src/pages, src/types)
- `docs/archive/` - Original CSV/text data files
- `data/campaign.db` - SQLite database (gitignored)
- `data/export/` - JSON dumps (git-tracked)
- `uploads/` - Journal images

## Dev Workflow
- `make dev` - Runs both Go backend (`:9090`) + Vite dev server (`:1337`, proxies `/api` -> `:9090`)
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

## Skills (`.claude/skills/`)
- **`/diff-review`** — Reviews current git diff (staged + unstaged changes). Scoped strictly to changed code. Outputs impact-ordered suggestions with a top-3 priority list. Use for pre-commit or PR-level review.
- **`/codebase-review`** — Full codebase architectural review. Focuses on modularity and dark patterns (code anti-patterns + UI dark patterns). Fast, high-level pass grouped by severity (Critical / Warning / Suggestion). Use for periodic health checks.

## Git Conventions
- Do NOT add `Co-Authored-By` trailers to commit messages. Keep commits clean and single-line where appropriate.

## TODO Tracking
- When asked to "add a todo" or "add to TODO.md", update the `TODO.md` file in the project root.

## App Naming
- If the user updates the app name, ask whether the Go module path (`github.com/adamk72/quartermaster-app` in `go.mod` and all import statements) should be updated to match.

## Coding Principles
- **Avoid hardcoding values.** Hardcoded strings, IDs, or magic values usually indicate that not enough context has been gathered about the broader system. Before hardcoding, ask the user how the value should be sourced (database, config, user input, etc.). Hardcoding is a signal to pause and ask questions.
- **Number input fields must use string state.** Never use `useState<number>` for HTML number inputs. Using `Number(e.target.value)` converts empty string to `0` or `NaN`, which prevents the user from clearing the field to type a new value. Always use `useState<string>('')` and parse to number only on submit.

## Conventions
- Party members: Andurin, Ayloc, Rüya, Sachan, Ingvild, Hrothgar
- Currency: 1pp = 10gp, 1ep = 0.5gp, 1sp = 0.1gp, 1cp = 0.01gp
- TBI = "to be identified" (unidentified magic items)
