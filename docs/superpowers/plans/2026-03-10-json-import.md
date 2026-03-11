# JSON Import for Inventory — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JSON paste-and-import flow to bulk-create inventory items, plus an AI conversion prompt for spreadsheet CSV → JSON.

**Architecture:** New `POST /api/v1/items/import` endpoint accepts a JSON array of items, validates container IDs, inserts all in a single transaction with changelog entries. Frontend adds an Import button → modal with textarea → preview table → confirm. A reusable AI prompt document handles CSV-to-JSON conversion outside the app.

**Tech Stack:** Go (backend handler), React + TypeScript + Tailwind (frontend modal), Zustand (store method)

---

## Chunk 1: Backend + Frontend + Prompt

### Task 1: Backend Import Endpoint

**Files:**
- Modify: `backend/internal/api/items.go` (add `handleImportItems`)
- Modify: `backend/internal/api/routes.go` (register route)

- [ ] **Step 1: Add the import handler to `items.go`**

Add after the `handleCreateItem` function (around line 247). The handler:
- Reads a JSON array of items from the request body
- Validates each item has a `name`
- Validates each `container_id` exists (batch query)
- Gets current max `sort_order`
- Inserts all items in a single transaction, assigning sequential sort_order
- Logs changelog entries
- Returns `{ "count": N, "items": [...] }`

```go
func handleImportItems(w http.ResponseWriter, r *http.Request) {
	var items []types.Item
	if err := readJSON(r, &items); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: expected JSON array of items")
		return
	}

	if len(items) == 0 {
		writeError(w, http.StatusBadRequest, "no items to import")
		return
	}

	// Validate all items have names and collect container IDs to check
	containerIDs := map[string]bool{}
	for i, item := range items {
		if item.Name == "" {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("item %d: name is required", i+1))
			return
		}
		if item.ContainerID != nil && *item.ContainerID != "" {
			containerIDs[*item.ContainerID] = false
		}
	}

	// Batch validate container IDs
	if len(containerIDs) > 0 {
		rows, err := db.DB.Query("SELECT id FROM containers")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to validate containers")
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			rows.Scan(&id)
			if _, ok := containerIDs[id]; ok {
				containerIDs[id] = true
			}
		}
		for id, found := range containerIDs {
			if !found {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("container_id %q not found", id))
				return
			}
		}
	}

	now := time.Now()

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	// Get current max sort_order
	var maxSort int
	tx.QueryRow("SELECT COALESCE(MAX(sort_order), 0) FROM items").Scan(&maxSort)

	created := make([]types.Item, 0, len(items))
	for i, item := range items {
		item.CreatedAt = now
		item.UpdatedAt = now
		if item.Quantity == 0 {
			item.Quantity = 1
		}
		if item.Category == "" {
			item.Category = "Item"
		}
		sortOrder := maxSort + i + 1

		result, err := tx.Exec(
			"INSERT INTO items (name, quantity, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, 0, 1, NULL, ?, ?, ?, ?, ?)",
			item.Name, item.Quantity, item.GameDate, item.Category, item.ContainerID,
			item.UnitWeightLbs, item.UnitValueGP,
			item.Name, item.Notes, sortOrder, item.CreatedAt, item.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to insert item %d (%s): %v", i+1, item.Name, err))
			return
		}

		id, _ := result.LastInsertId()
		item.ID = int(id)
		item.SortOrder = sortOrder
		item.Identified = true
		item.Singular = item.Name
		created = append(created, item)
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit import")
		return
	}

	// Log changelog
	user := GetUser(r)
	if user != nil {
		for _, item := range created {
			LogChange(&user.ID, "items", strconv.Itoa(item.ID), "create", "{}")
		}
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"count": len(created),
		"items": created,
	})
}
```

- [ ] **Step 2: Register the route in `routes.go`**

Add after the `bulk-labels` route (line 48):

```go
mux.Handle("POST /api/v1/items/import", auth(handleImportItems))
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/items.go backend/internal/api/routes.go
git commit -m "Add POST /api/v1/items/import endpoint for bulk JSON import"
```

---

### Task 2: Frontend Import Modal

**Files:**
- Create: `frontend/src/components/Inventory/ImportModal.tsx`
- Modify: `frontend/src/stores/useInventoryStore.ts` (add `importItems` method)
- Modify: `frontend/src/pages/InventoryPage.tsx` (add Import button + modal state)

- [ ] **Step 1: Add `importItems` to the inventory store**

In `frontend/src/stores/useInventoryStore.ts`, add to the interface:

```typescript
importItems: (items: Partial<Item>[]) => Promise<{ count: number; items: Item[] }>
```

Add implementation in the store body (after `createItem`):

```typescript
importItems: async (items) => {
  const result = await api.post<{ count: number; items: Item[] }>('/items/import', items)
  // Refresh items list after import
  get().fetchItems()
  get().fetchSummary()
  return result
},
```

- [ ] **Step 2: Create the ImportModal component**

Create `frontend/src/components/Inventory/ImportModal.tsx`:

```tsx
import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useInventoryStore } from '../../stores/useInventoryStore'
import { toast } from '../../stores/useToastStore'
import type { Container } from '../../types'

interface ImportModalProps {
  onClose: () => void
  containers: Container[]
}

interface ImportItem {
  name: string
  quantity: number
  unit_value_gp: number | null
  game_date: string
  container_id: string | null
  notes: string
}

export function ImportModal({ onClose, containers }: ImportModalProps) {
  const { importItems } = useInventoryStore()
  const [jsonText, setJsonText] = useState('')
  const [parsed, setParsed] = useState<ImportItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function handleParse() {
    setError(null)
    setParsed(null)
    try {
      const data = JSON.parse(jsonText)
      if (!Array.isArray(data)) {
        setError('Expected a JSON array')
        return
      }
      if (data.length === 0) {
        setError('Array is empty')
        return
      }

      // Validate each item
      const containerIds = new Set(containers.map((c) => c.id))
      const errors: string[] = []
      const items: ImportItem[] = data.map((raw: Record<string, unknown>, i: number) => {
        if (!raw.name || typeof raw.name !== 'string') {
          errors.push(`Item ${i + 1}: missing name`)
        }
        if (raw.container_id && !containerIds.has(raw.container_id as string)) {
          errors.push(`Item ${i + 1}: unknown container "${raw.container_id}"`)
        }
        return {
          name: (raw.name as string) || '',
          quantity: typeof raw.quantity === 'number' ? raw.quantity : 1,
          unit_value_gp: typeof raw.unit_value_gp === 'number' ? raw.unit_value_gp : null,
          game_date: (raw.game_date as string) || '',
          container_id: (raw.container_id as string) || null,
          notes: (raw.notes as string) || '',
        }
      })

      if (errors.length > 0) {
        setError(errors.join('\n'))
        return
      }

      setParsed(items)
    } catch {
      setError('Invalid JSON — check formatting and try again')
    }
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    try {
      const result = await importItems(parsed)
      toast.success(`Imported ${result.count} items`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function getContainerName(id: string | null): string {
    if (!id) return '—'
    const c = containers.find((c) => c.id === id)
    return c ? c.name : id
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading text-lg font-bold text-parchment">Import Items</h3>
          <button onClick={onClose} className="text-parchment-muted hover:text-parchment text-xl">&times;</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {!parsed ? (
            <>
              <p className="text-sm text-parchment-dim">
                Paste the JSON array generated by your AI conversion tool.
              </p>
              <textarea
                className="input-themed w-full h-48 font-mono text-xs"
                placeholder='[{"name": "Longsword", "quantity": 1, ...}]'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              )}
              <button
                onClick={handleParse}
                disabled={!jsonText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors disabled:opacity-50"
              >
                Preview
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald text-sm">
                <CheckCircle2 className="w-4 h-4" />
                {parsed.length} items ready to import
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card-hover text-parchment-dim">
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Value (gp)</th>
                      <th className="text-left p-2">Container</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((item, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 text-parchment">{item.name}</td>
                        <td className="p-2 text-right text-parchment-dim">{item.quantity}</td>
                        <td className="p-2 text-right text-gold">{item.unit_value_gp ?? '—'}</td>
                        <td className="p-2 text-parchment-dim">{getContainerName(item.container_id)}</td>
                        <td className="p-2 text-parchment-dim">{item.game_date || '—'}</td>
                        <td className="p-2 text-parchment-dim truncate max-w-[150px]">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setParsed(null); setError(null) }}
                  className="px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : `Import ${parsed.length} Items`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add Import button and modal to InventoryPage**

In `frontend/src/pages/InventoryPage.tsx`:

Add import at top:
```typescript
import { ImportModal } from '../components/Inventory/ImportModal'
import { Upload } from 'lucide-react'  // add Upload to existing lucide import
```

Add state (alongside other modal states):
```typescript
const [showImport, setShowImport] = useState(false)
```

Add button next to "Add Item" button (inside the `<div className="flex gap-2">` at line 267):
```tsx
<button
  onClick={() => setShowImport(true)}
  className="flex items-center gap-2 px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors"
>
  <Upload className="w-4 h-4" /> Import
</button>
```

Add modal render (alongside other modals at end of component):
```tsx
{showImport && (
  <ImportModal onClose={() => setShowImport(false)} containers={containers} />
)}
```

- [ ] **Step 4: Verify frontend compiles**

Run: `cd frontend && pnpm typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Inventory/ImportModal.tsx frontend/src/stores/useInventoryStore.ts frontend/src/pages/InventoryPage.tsx
git commit -m "Add JSON import modal to inventory page"
```

---

### Task 3: AI Conversion Prompt

**Files:**
- Create: `docs/import-prompt.md`

- [ ] **Step 1: Write the AI conversion prompt**

Create `docs/import-prompt.md` with a ready-to-use prompt the user can paste into any AI along with their CSV data. The prompt should:

- Describe the expected JSON output format
- Map spreadsheet columns to JSON fields
- Handle value parsing ("100 gp" → `100`)
- Handle empty Qty (default to 1)
- List known container IDs to map "Who" values
- Handle blank/missing fields

```markdown
# Inventory CSV → JSON Conversion Prompt

Copy the prompt below and paste it into ChatGPT, Claude, or any AI assistant along with your CSV data.

---

Convert the following CSV data into a JSON array. Each row becomes one object.

**Column mapping:**
- `Qty` → `quantity` (integer, default 1 if blank)
- `Item` → `name` (string, required)
- `Credit` → `unit_value_gp` (number — strip "gp"/"sp" suffix, convert to gp. E.g., "100 gp" → 100, "5 sp" → 0.5. Use `null` if blank)
- `Debit` → ignore this column
- `Game Date` → `game_date` (string, keep as-is in M/D format)
- `Category` → ignore this column
- `Who` → `container_id` (string, map using the table below. Use `null` if blank)
- `Location/Vendor/Notes` → `notes` (string, use "" if blank)

**Container ID mapping for "Who" column:**
- "Party" or "party" → `"party"`
- "Andurin" → `"andurin"`
- "Ayloc" → `"ayloc"`
- "Rüya" or "Ruya" → `"ruya"`
- "Sachan" → `"sachan"`
- "Ingvild" → `"ingvild"`
- "Hrothgar" → `"hrothgar"`
- "Bag of Holding" → `"bag-of-holding"`
- Any other value → use the value lowercased with spaces replaced by hyphens

**Output format:**
Return ONLY a JSON array, no markdown code fences, no explanation. Example:

[
  {
    "name": "Longsword",
    "quantity": 1,
    "unit_value_gp": 15,
    "game_date": "10/22",
    "container_id": "party",
    "notes": ""
  }
]

**Here is the CSV data:**

<paste CSV here>
```

- [ ] **Step 2: Commit**

```bash
git add docs/import-prompt.md
git commit -m "Add AI conversion prompt for spreadsheet CSV to import JSON"
```
