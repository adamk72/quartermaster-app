# Quartermaster

A D&D campaign management webapp for tracking inventory, coins, quests, XP, critters, and session notes. Replaces Google Sheets + Docs for a weekly campaign.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand
- **Backend**: Go 1.22+ with stdlib `net/http`
- **Database**: SQLite

## Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/installation)

## Setup

### 1. Install frontend dependencies

```bash
cd frontend && pnpm install && cd ..
```

### 2. Start fresh (empty database)

```bash
make dev
```

The database is created automatically on first run. Log in with any username and the invite code `dragons`.

### 2. Start from an exported JSON backup

Copy the exported JSON files into `backend/data/export/`, then run:

```bash
make restore
make dev
```

`make restore` imports the JSON files into `backend/data/campaign.db`, then `make dev` starts the app.

## Running

```bash
make dev        # backend on :8080, frontend dev server on :5173
```

Both backend and frontend logs are interleaved in the same terminal. To see them separately, run each in its own terminal:

```bash
make dev-backend   # Terminal 1 — Go backend logs
make dev-frontend  # Terminal 2 — Vite output
```

Open [http://localhost:5173](http://localhost:5173).

## Other Commands

```bash
make build      # production build (outputs a single Go binary + embedded frontend)
make export     # dump database to backend/data/export/*.json
make restore    # import backend/data/export/*.json into database
make seed       # import original CSV archive data (first-time setup only)
make lint       # run frontend ESLint + backend go vet
```

## Data

- `backend/data/campaign.db` — SQLite database (gitignored)
- `backend/data/export/` — JSON snapshots of all tables (git-tracked, used for backup/transfer)
- `uploads/` — Journal session images
