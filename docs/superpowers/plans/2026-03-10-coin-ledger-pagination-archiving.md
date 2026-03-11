# Coin Ledger Pagination + Soft Archiving Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add soft archiving and recent/all pagination to the coin ledger so it stays manageable as it grows.

**Architecture:** New `archived` column on `coin_ledger` table. Backend filters by archived status via query param. New archive endpoint bulk-updates entries before a cutoff date. Frontend shows last 20 entries by default with toggles for "show all" and "show archived."

**Tech Stack:** Go (backend API), SQLite (migration), React + TypeScript (frontend)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/migrations/018_coin_ledger_archived.sql` | Create | Migration: add `archived` column |
| `backend/internal/types/types.go:71-84` | Modify | Add `Archived` field to `CoinLedgerEntry` struct |
| `backend/internal/api/coins.go:14-32` | Modify | Filter by archived param in `handleListCoins` |
| `backend/internal/api/coins.go` (new funcs) | Modify | Add `handleArchiveCoins` + `handleArchivePreview` + `parseGameDate` helper |
| `backend/internal/api/routes.go:57-62` | Modify | Register new archive + preview routes |
| `frontend/src/types/index.ts:86-99` | Modify | Add `archived` field to `CoinLedgerEntry` |
| `frontend/src/pages/WealthPage.tsx:15-198` | Modify | Add pagination, archive UI with preview count, and show-archived toggle |

---

## Task 1: Database Migration

**Files:**
- Create: `backend/migrations/018_coin_ledger_archived.sql`

- [ ] **Step 1: Create migration file**

```sql
ALTER TABLE coin_ledger ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Verify migration runs**

Run: `cd backend && go run ./cmd/server`
Expected: Server starts, log shows "Applied migration: 018_coin_ledger_archived.sql"
Stop the server after verifying.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/018_coin_ledger_archived.sql
git commit -m "Add archived column to coin_ledger table"
```

---

## Task 2: Backend — Go Types

**Files:**
- Modify: `backend/internal/types/types.go:71-84`

- [ ] **Step 1: Add Archived field to CoinLedgerEntry**

Add `Archived bool` field after `Notes`:

```go
type CoinLedgerEntry struct {
	ID          int       `json:"id"`
	GameDate    string    `json:"game_date"`
	Description string    `json:"description"`
	CP          int       `json:"cp"`
	SP          int       `json:"sp"`
	EP          int       `json:"ep"`
	GP          int       `json:"gp"`
	PP          int       `json:"pp"`
	Direction   string    `json:"direction"`
	ItemID      *int      `json:"item_id"`
	Notes       string    `json:"notes"`
	Archived    bool      `json:"archived"`
	CreatedAt   time.Time `json:"created_at"`
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: Build succeeds (no errors)

- [ ] **Step 3: Commit**

```bash
git add backend/internal/types/types.go
git commit -m "Add Archived field to CoinLedgerEntry type"
```

---

## Task 3: Backend — Update handleListCoins with archived filter

**Files:**
- Modify: `backend/internal/api/coins.go:14-32`

- [ ] **Step 1: Update handleListCoins to filter by archived status and include archived field in scan**

Replace the existing `handleListCoins` function:

```go
func handleListCoins(w http.ResponseWriter, r *http.Request) {
	includeArchived := r.URL.Query().Get("archived") == "true"

	query := "SELECT id, game_date, description, cp, sp, ep, gp, pp, direction, item_id, notes, archived, created_at FROM coin_ledger"
	if !includeArchived {
		query += " WHERE archived = 0"
	}
	query += " ORDER BY created_at DESC"

	rows, err := db.DB.Query(query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query coins")
		return
	}
	defer rows.Close()

	entries := []types.CoinLedgerEntry{}
	for rows.Next() {
		var e types.CoinLedgerEntry
		if err := rows.Scan(&e.ID, &e.GameDate, &e.Description, &e.CP, &e.SP, &e.EP, &e.GP, &e.PP, &e.Direction, &e.ItemID, &e.Notes, &e.Archived, &e.CreatedAt); err != nil {
			log.Printf("coin ledger scan error: %v", err)
			continue
		}
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}
```

Key changes:
- Added `archived` to SELECT columns
- Added `&e.Archived` to Scan
- Filter `WHERE archived = 0` unless `?archived=true` query param is present

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add backend/internal/api/coins.go
git commit -m "Filter archived entries in coin ledger list endpoint"
```

---

## Task 4: Backend — Add handleArchiveCoins endpoint

**Files:**
- Modify: `backend/internal/api/coins.go` (add new function)
- Modify: `backend/internal/api/routes.go:57-62`

- [ ] **Step 1: Add parseGameDate helper and handleArchiveCoins + handleArchivePreview functions to coins.go**

Add these functions after `handleDeleteCoin`. Game dates are M/D or M/D/YY format, which can't be compared lexicographically (e.g., "9/1" > "10/1"). We parse them in Go to compare correctly.

```go
// parseGameDate parses "M/D" or "M/D/YY" into (month, day, year).
// Returns (0,0,0) if unparseable. Year defaults to current year if omitted.
func parseGameDate(s string) (int, int, int) {
	parts := strings.Split(s, "/")
	if len(parts) < 2 {
		return 0, 0, 0
	}
	m, err1 := strconv.Atoi(parts[0])
	d, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return 0, 0, 0
	}
	y := time.Now().Year()
	if len(parts) == 3 {
		yy, err := strconv.Atoi(parts[2])
		if err != nil {
			return 0, 0, 0
		}
		if yy < 100 {
			yy += 2000
		}
		y = yy
	}
	return m, d, y
}

// gameDateOnOrBefore returns true if dateStr is on or before cutoffStr.
// Both are M/D or M/D/YY format. Returns false if either can't be parsed.
func gameDateOnOrBefore(dateStr, cutoffStr string) bool {
	m1, d1, y1 := parseGameDate(dateStr)
	m2, d2, y2 := parseGameDate(cutoffStr)
	if m1 == 0 || m2 == 0 {
		return false
	}
	if y1 != y2 {
		return y1 < y2
	}
	if m1 != m2 {
		return m1 < m2
	}
	return d1 <= d2
}

func collectArchivableIDs(beforeDate string) ([]int, error) {
	rows, err := db.DB.Query("SELECT id, game_date, created_at FROM coin_ledger WHERE archived = 0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cutoffM, cutoffD, cutoffY := parseGameDate(beforeDate)
	// For dateless entries, use created_at comparison. Build a cutoff time
	// at end of the cutoff date.
	var cutoffTime time.Time
	if cutoffM > 0 {
		cutoffTime = time.Date(cutoffY, time.Month(cutoffM), cutoffD, 23, 59, 59, 0, time.Local)
	}

	var ids []int
	for rows.Next() {
		var id int
		var gameDate string
		var createdAt time.Time
		if err := rows.Scan(&id, &gameDate, &createdAt); err != nil {
			continue
		}
		if gameDate != "" {
			if gameDateOnOrBefore(gameDate, beforeDate) {
				ids = append(ids, id)
			}
		} else if !cutoffTime.IsZero() && createdAt.Before(cutoffTime) {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

func handleArchivePreview(w http.ResponseWriter, r *http.Request) {
	beforeDate := r.URL.Query().Get("before_date")
	if beforeDate == "" {
		writeJSON(w, http.StatusOK, map[string]any{"count": 0})
		return
	}
	ids, err := collectArchivableIDs(beforeDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query entries")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(ids)})
}

func handleArchiveCoins(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BeforeDate string `json:"before_date"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.BeforeDate == "" {
		writeError(w, http.StatusBadRequest, "before_date required")
		return
	}

	ids, err := collectArchivableIDs(req.BeforeDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query entries")
		return
	}
	if len(ids) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"archived_count": 0})
		return
	}

	// Build UPDATE with ID list
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids))
	for i, id := range ids {
		placeholders[i] = "?"
		args[i] = id
	}
	query := "UPDATE coin_ledger SET archived = 1 WHERE id IN (" + strings.Join(placeholders, ",") + ")"
	if _, err := db.DB.Exec(query, args...); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to archive entries")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "coin_ledger", "bulk", "update", fmt.Sprintf(`{"archived_count":%d}`, len(ids)))
	}

	writeJSON(w, http.StatusOK, map[string]any{"archived_count": len(ids)})
}
```

Note: `strings` is already imported via the existing file's imports — verify and add if needed.

- [ ] **Step 2: Add `"strings"` to imports in coins.go if not already present**

Check the imports at the top of `coins.go`. The file currently imports `fmt`, `log`, `net/http`, `strconv`, `time`. Add `"strings"` to the import block.

- [ ] **Step 3: Register the routes**

In `routes.go`, add after the existing coin routes (line 62):

```go
mux.Handle("POST /api/v1/coins/archive", auth(handleArchiveCoins))
mux.Handle("GET /api/v1/coins/archive/preview", auth(handleArchivePreview))
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/coins.go backend/internal/api/routes.go
git commit -m "Add coin ledger archive and preview endpoints"
```

---

## Task 5: Frontend — Update types

**Files:**
- Modify: `frontend/src/types/index.ts:86-99`

- [ ] **Step 1: Add archived field to CoinLedgerEntry interface**

Add `archived: boolean` after `notes`:

```typescript
export interface CoinLedgerEntry {
  id: number
  game_date: string
  description: string
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
  direction: 'in' | 'out'
  item_id: number | null
  notes: string
  archived: boolean
  created_at: string
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "Add archived field to CoinLedgerEntry type"
```

---

## Task 6: Frontend — Pagination and Archive UI

**Files:**
- Modify: `frontend/src/pages/WealthPage.tsx:15-198`

This is the main UI task. It adds three pieces of functionality to the existing `WealthPage` component:

1. **Recent/All toggle** — default shows 20 entries, toggle to see all
2. **Archive action** — inline form near ledger header to archive entries before a date
3. **Show archived toggle** — loads and shows archived entries at bottom of table, dimmed

- [ ] **Step 1: Add state variables**

In `WealthPage`, add these state variables after the existing ones (around line 24):

```typescript
const [showAll, setShowAll] = useState(false)
const [showArchived, setShowArchived] = useState(false)
const [archivedEntries, setArchivedEntries] = useState<CoinLedgerEntry[]>([])
const [archivedCount, setArchivedCount] = useState(0)
const [showArchiveForm, setShowArchiveForm] = useState(false)
const [archiveBefore, setArchiveBefore] = useState('')
const [archivePreviewCount, setArchivePreviewCount] = useState<number | null>(null)
const [archiving, setArchiving] = useState(false)
```

- [ ] **Step 2: Update fetchAll to track archived count efficiently**

The backend `GET /coins?archived=true` returns all entries. We get the archived count by subtracting. But we only need the count, not all the data. Since we already fetch the full non-archived list, we can get just the total count with a lightweight query. For now, use the existing endpoint since the data is small — but filter client-side.

Update the `fetchAll` callback:

```typescript
const fetchAll = useCallback(async () => {
  try {
    const [bal, entries, sum, allEntries] = await Promise.all([
      api.get<CoinBalance>('/coins/balance'),
      api.get<CoinLedgerEntry[]>('/coins'),
      api.get<ItemSummary>('/items/summary'),
      api.get<CoinLedgerEntry[]>('/coins?archived=true'),
    ])
    setBalance(bal)
    setLedger(entries)
    setSummary(sum)
    setArchivedCount(allEntries.length - entries.length)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to fetch wealth data')
  }
}, [])
```

- [ ] **Step 3: Add archive handler functions**

Add these after `handleDeleteEntry`:

```typescript
const fetchArchivePreview = async (dateStr: string) => {
  if (!dateStr) { setArchivePreviewCount(null); return }
  try {
    const result = await api.get<{ count: number }>(`/coins/archive/preview?before_date=${encodeURIComponent(dateStr)}`)
    setArchivePreviewCount(result.count)
  } catch {
    setArchivePreviewCount(null)
  }
}

const handleArchive = async () => {
  if (!archiveBefore) return
  setArchiving(true)
  try {
    const result = await api.post<{ archived_count: number }>('/coins/archive', { before_date: archiveBefore })
    toast.success(`Archived ${result.archived_count} entries`)
    setShowArchiveForm(false)
    setArchiveBefore('')
    setArchivePreviewCount(null)
    setShowArchived(false)
    setArchivedEntries([])
    await fetchAll()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to archive')
  } finally {
    setArchiving(false)
  }
}

const handleToggleArchived = async () => {
  if (!showArchived && archivedEntries.length === 0) {
    try {
      const allEntries = await api.get<CoinLedgerEntry[]>('/coins?archived=true')
      setArchivedEntries(allEntries.filter(e => e.archived))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch archived entries')
      return
    }
  }
  setShowArchived(!showArchived)
}
```

- [ ] **Step 4: Add pagination logic**

Add this computed value before the return statement:

```typescript
const RECENT_COUNT = 20
const displayedEntries = showAll ? ledger : ledger.slice(0, RECENT_COUNT)
const hasMore = ledger.length > RECENT_COUNT
```

- [ ] **Step 5: Update the ledger header section**

Replace the existing ledger header button and the section below it (lines 148-198) with this updated version:

```tsx
{/* Coin ledger */}
<div className="flex items-center gap-2 mb-3 flex-wrap">
  <button onClick={() => setLedgerCollapsed(!ledgerCollapsed)} className="flex items-center gap-2 group">
    <ChevronDown className={clsx('w-4 h-4 text-parchment-muted transition-transform', ledgerCollapsed && '-rotate-90')} />
    <h3 className="font-heading text-lg font-semibold text-parchment group-hover:text-gold transition-colors">Coin Ledger</h3>
    <span className="text-sm text-parchment-muted">
      ({hasMore && !showAll ? `${RECENT_COUNT} of ${ledger.length}` : ledger.length})
    </span>
  </button>
  <div className="ml-auto flex items-center gap-3 text-sm">
    {!ledgerCollapsed && (
      <>
        <button
          onClick={() => setShowArchiveForm(!showArchiveForm)}
          className="text-parchment-muted hover:text-parchment transition-colors"
        >
          Archive old entries
        </button>
        {archivedCount > 0 && (
          <button
            onClick={handleToggleArchived}
            className={clsx('transition-colors', showArchived ? 'text-gold' : 'text-parchment-muted hover:text-parchment')}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
          </button>
        )}
      </>
    )}
  </div>
</div>

{/* Archive form */}
{showArchiveForm && !ledgerCollapsed && (
  <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-end gap-3 flex-wrap">
    <div>
      <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Archive entries before</label>
      <input
        className="input-themed w-32"
        value={archiveBefore}
        onChange={(e) => { setArchiveBefore(e.target.value); fetchArchivePreview(e.target.value) }}
        placeholder="M/D or M/D/YY"
      />
    </div>
    {archivePreviewCount !== null && archiveBefore && (
      <span className="pb-2 text-sm text-parchment-dim">
        {archivePreviewCount === 0 ? 'No entries to archive' : `${archivePreviewCount} entries will be archived`}
      </span>
    )}
    <button
      onClick={handleArchive}
      disabled={archiving || !archiveBefore || archivePreviewCount === 0}
      className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50"
    >
      {archiving ? 'Archiving...' : 'Archive'}
    </button>
    <button
      onClick={() => { setShowArchiveForm(false); setArchiveBefore(''); setArchivePreviewCount(null) }}
      className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors text-sm"
    >
      Cancel
    </button>
  </div>
)}

{!ledgerCollapsed && (
  <div className="bg-card border border-border rounded-xl overflow-x-auto">
    {ledger.length === 0 ? (
      <div className="p-8 text-center text-parchment-muted">No coin entries yet</div>
    ) : (
      <>
        <table className="tt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Direction</th>
              <th>PP</th>
              <th>GP</th>
              <th>EP</th>
              <th>SP</th>
              <th>CP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayedEntries.map((e) => (
              <tr key={e.id}>
                <td className="text-parchment-dim">{e.game_date || '--'}</td>
                <td className="font-medium">{e.description || '--'}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.direction === 'in' ? 'bg-emerald/15 text-emerald' : 'bg-wine/15 text-wine'}`}>
                    {e.direction}
                  </span>
                </td>
                <td className={e.pp ? DENOM_COLORS.pp : 'text-parchment-muted'}>{e.pp || '--'}</td>
                <td className={e.gp ? DENOM_COLORS.gp : 'text-parchment-muted'}>{e.gp || '--'}</td>
                <td className={e.ep ? DENOM_COLORS.ep : 'text-parchment-muted'}>{e.ep || '--'}</td>
                <td className={e.sp ? DENOM_COLORS.sp : 'text-parchment-muted'}>{e.sp || '--'}</td>
                <td className={e.cp ? DENOM_COLORS.cp : 'text-parchment-muted'}>{e.cp || '--'}</td>
                <td>
                  <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {/* Show archived entries dimmed at bottom */}
            {showArchived && archivedEntries.map((e) => (
              <tr key={`archived-${e.id}`} className="opacity-50">
                <td className="text-parchment-dim">{e.game_date || '--'}</td>
                <td className="font-medium">{e.description || '--'}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.direction === 'in' ? 'bg-emerald/15 text-emerald' : 'bg-wine/15 text-wine'}`}>
                    {e.direction}
                  </span>
                </td>
                <td className={e.pp ? DENOM_COLORS.pp : 'text-parchment-muted'}>{e.pp || '--'}</td>
                <td className={e.gp ? DENOM_COLORS.gp : 'text-parchment-muted'}>{e.gp || '--'}</td>
                <td className={e.ep ? DENOM_COLORS.ep : 'text-parchment-muted'}>{e.ep || '--'}</td>
                <td className={e.sp ? DENOM_COLORS.sp : 'text-parchment-muted'}>{e.sp || '--'}</td>
                <td className={e.cp ? DENOM_COLORS.cp : 'text-parchment-muted'}>{e.cp || '--'}</td>
                <td>
                  <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Show all / Show recent toggle */}
        {hasMore && (
          <div className="p-3 text-center border-t border-border">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-parchment-muted hover:text-gold transition-colors"
            >
              {showAll ? 'Show recent' : `Show all ${ledger.length} entries`}
            </button>
          </div>
        )}
      </>
    )}
  </div>
)}
```

- [ ] **Step 6: Verify frontend compiles**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: No errors

- [ ] **Step 7: Manual test**

Run: `make dev`

Verify:
1. Coin ledger shows with entry count in header
2. If >20 entries, only 20 shown with "Show all N entries" link at bottom
3. "Archive old entries" button appears near header, opens inline form
4. Archiving entries moves them out of default view
5. "Show archived (N)" appears when archived entries exist
6. Clicking it shows archived entries dimmed at bottom of table
7. Balance cards unchanged (archived entries still count)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/pages/WealthPage.tsx
git commit -m "Add pagination and soft archiving UI to coin ledger"
```
