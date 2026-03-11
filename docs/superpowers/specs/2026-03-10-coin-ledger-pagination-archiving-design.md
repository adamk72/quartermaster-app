# Coin Ledger Pagination + Soft Archiving

## Problem
The coin ledger grows with every transaction (sales, conversions, loot splits) and will become unwieldy over time. With ~40 entries already, the full table is hard to scan.

## Solution
Hybrid approach: paginate the default view (show recent entries) and allow soft-archiving old entries to declutter without losing data.

## Data Model

Add `archived` column to `coin_ledger` table:

```sql
ALTER TABLE coin_ledger ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
```

Archived entries still contribute to balance calculations — archiving is purely a display concern.

## Backend

### Modified: `GET /api/v1/coins`
- Add optional query param `?archived=true` to include archived entries
- Default behavior: returns only non-archived entries (`WHERE archived = 0`), ordered by `created_at DESC`
- When `?archived=true`: returns all entries, with archived entries included (still ordered by `created_at DESC`)

### New: `POST /api/v1/coins/archive`
- Request body: `{ "before_date": "M/D" }` or `{ "before_date": "M/D/YY" }`
- Sets `archived = 1` on all entries where `game_date <= before_date` OR (`game_date = ''` AND `created_at` is before the resolved date)
- Returns `{ "archived_count": N }`
- Logs to changelog

### Modified: `GET /api/v1/coins/balance`
- No change. Balance query already sums ALL entries regardless of archived status.

## Frontend

### Pagination: Recent/All Toggle
- Default view: last 20 non-archived entries
- Header shows count: "Coin Ledger (18)" when showing partial, "Coin Ledger (18 of 45)" when truncated
- "Show all" text toggle to expand to full non-archived list
- Toggle text switches to "Show recent" when expanded

### Archive Action
- Small "Archive old entries" button near the ledger section header (not in the top action bar)
- Clicking opens an inline form below the header:
  - Date input (game date format M/D or M/D/YY)
  - Preview: "Archive N entries before this date"
  - Confirm / Cancel buttons
- After archiving, toast: "Archived N entries"

### Show Archived Toggle
- "Show archived (N)" text link near the ledger header, only visible when archived entries exist
- When toggled on, archived entries appear at the bottom of the table
- Archived entries rendered with dimmed/muted text styling to visually distinguish them
- Archived entries retain their delete button

### UI Layout (Ledger Header Area)
```
[v] Coin Ledger (18 of 32)          [Archive old entries]  [Show archived (14)]
```

When archive form is open:
```
[v] Coin Ledger (18 of 32)          [Archive old entries]  [Show archived (14)]
   ┌─────────────────────────────────────────────────────┐
   │ Archive entries before: [____]  (12 entries)  [Archive] [Cancel] │
   └─────────────────────────────────────────────────────┘
```
