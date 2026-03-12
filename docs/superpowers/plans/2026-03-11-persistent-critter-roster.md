# Persistent Critter Roster Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat critter list with a blueprint/instance model — shared party roster of creature templates that spawn independent active instances.

**Architecture:** New `critter_templates` table for blueprints, modified `critters` table for instances with `template_id` FK. Blueprint CRUD at `/api/v1/critter-templates`, modified summon endpoint at `POST /api/v1/critters`. Sidebar roster + main grid layout on the critters page.

**Tech Stack:** Go 1.23 stdlib, SQLite, React 19, Zustand 5, Tailwind CSS v4, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-11-persistent-critter-roster-design.md`

---

## Chunk 1: Backend — Migration, Types, Template CRUD

### Task 1: Database Migration

**Files:**
- Create: `backend/migrations/019_critter_templates.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Create critter_templates table
CREATE TABLE IF NOT EXISTS critter_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hp_max INTEGER NOT NULL DEFAULT 0,
    ac INTEGER NOT NULL DEFAULT 10,
    speed INTEGER NOT NULL DEFAULT 30,
    initiative INTEGER NOT NULL DEFAULT 0,
    save_str INTEGER NOT NULL DEFAULT 0,
    save_dex INTEGER NOT NULL DEFAULT 0,
    save_con INTEGER NOT NULL DEFAULT 0,
    save_int INTEGER NOT NULL DEFAULT 0,
    save_wis INTEGER NOT NULL DEFAULT 0,
    save_cha INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to critters
ALTER TABLE critters ADD COLUMN template_id INTEGER REFERENCES critter_templates(id);
ALTER TABLE critters ADD COLUMN instance_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE critters ADD COLUMN speed INTEGER NOT NULL DEFAULT 30;
ALTER TABLE critters ADD COLUMN initiative INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_str INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_dex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_con INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_int INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_wis INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_cha INTEGER NOT NULL DEFAULT 0;

-- Migrate existing critters: create a template from the most recent critter of each name
INSERT INTO critter_templates (name, hp_max, ac, notes)
SELECT name, hp_max, ac, notes
FROM critters
WHERE id IN (SELECT MAX(id) FROM critters GROUP BY name);

-- Link existing critters to their templates
UPDATE critters SET template_id = (
    SELECT ct.id FROM critter_templates ct WHERE ct.name = critters.name
);

-- Delete dismissed critters (active=0) — instances are now ephemeral
DELETE FROM critters WHERE active = 0;

-- Create index for template lookup
CREATE INDEX IF NOT EXISTS idx_critter_templates_name ON critter_templates(name);
```

-- Add unique constraint to prevent race condition on instance numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_critters_name_instance ON critters(name, instance_number);

Note: SQLite doesn't support DROP COLUMN in older versions. The `active` column will remain in the table but be unused. The backend code will simply ignore it. The `active` field stays in Go/TS structs for DB compatibility but is not used in application logic.

- [ ] **Step 2: Verify migration applies cleanly**

Run: `cd backend && go run ./cmd/server`
Expected: Server starts without migration errors. Check logs for "applied migration 019".

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/019_critter_templates.sql
git commit -m "Add critter_templates migration with data migration"
```

---

### Task 2: Backend Types

**Files:**
- Modify: `backend/internal/types/types.go`

- [ ] **Step 1: Add CritterTemplate struct**

Add after the existing `Critter` struct in `types.go`:

```go
type CritterTemplate struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	HPMax      int       `json:"hp_max"`
	AC         int       `json:"ac"`
	Speed      int       `json:"speed"`
	Initiative int       `json:"initiative"`
	SaveSTR    int       `json:"save_str"`
	SaveDEX    int       `json:"save_dex"`
	SaveCON    int       `json:"save_con"`
	SaveINT    int       `json:"save_int"`
	SaveWIS    int       `json:"save_wis"`
	SaveCHA    int       `json:"save_cha"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
```

- [ ] **Step 2: Update Critter struct**

Replace the existing `Critter` struct with:

```go
type Critter struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	TemplateID     *int      `json:"template_id"`
	CharacterID    string    `json:"character_id"`
	InstanceNumber int       `json:"instance_number"`
	HPCurrent      int       `json:"hp_current"`
	HPMax          int       `json:"hp_max"`
	AC             int       `json:"ac"`
	Speed          int       `json:"speed"`
	Initiative     int       `json:"initiative"`
	SaveSTR        int       `json:"save_str"`
	SaveDEX        int       `json:"save_dex"`
	SaveCON        int       `json:"save_con"`
	SaveINT        int       `json:"save_int"`
	SaveWIS        int       `json:"save_wis"`
	SaveCHA        int       `json:"save_cha"`
	Notes          string    `json:"notes"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
```

Note: `TemplateID` is `*int` (nullable) since legacy rows may not have one. `Active` field kept for backward compat with DB column.

- [ ] **Step 3: Add SummonRequest type**

Add below the Critter struct:

```go
type SummonRequest struct {
	TemplateID  int    `json:"template_id"`
	CharacterID string `json:"character_id"`
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/types/types.go
git commit -m "Add CritterTemplate and SummonRequest types, extend Critter"
```

---

### Task 3: Template CRUD API Handlers

**Files:**
- Create: `backend/internal/api/critter_templates.go`
- Modify: `backend/internal/api/routes.go`

- [ ] **Step 1: Create critter_templates.go with all handlers**

Create `backend/internal/api/critter_templates.go`:

```go
package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListCritterTemplates(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(
		"SELECT id, name, hp_max, ac, speed, initiative, save_str, save_dex, save_con, save_int, save_wis, save_cha, notes, created_at, updated_at FROM critter_templates ORDER BY name",
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query critter templates")
		return
	}
	defer rows.Close()

	templates := []types.CritterTemplate{}
	for rows.Next() {
		var t types.CritterTemplate
		if err := rows.Scan(&t.ID, &t.Name, &t.HPMax, &t.AC, &t.Speed, &t.Initiative,
			&t.SaveSTR, &t.SaveDEX, &t.SaveCON, &t.SaveINT, &t.SaveWIS, &t.SaveCHA,
			&t.Notes, &t.CreatedAt, &t.UpdatedAt); err != nil {
			continue
		}
		templates = append(templates, t)
	}
	writeJSON(w, http.StatusOK, templates)
}

func handleCreateCritterTemplate(w http.ResponseWriter, r *http.Request) {
	var t types.CritterTemplate
	if err := readJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	result, err := db.DB.Exec(
		"INSERT INTO critter_templates (name, hp_max, ac, speed, initiative, save_str, save_dex, save_con, save_int, save_wis, save_cha, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		t.Name, t.HPMax, t.AC, t.Speed, t.Initiative,
		t.SaveSTR, t.SaveDEX, t.SaveCON, t.SaveINT, t.SaveWIS, t.SaveCHA,
		t.Notes, t.CreatedAt, t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create critter template: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	t.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", strconv.Itoa(t.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, t)
}

func handleUpdateCritterTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var t types.CritterTemplate
	if err := readJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t.UpdatedAt = time.Now()

	diffJSON, n, err := diffUpdate("critter_templates", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE critter_templates SET name=?, hp_max=?, ac=?, speed=?, initiative=?, save_str=?, save_dex=?, save_con=?, save_int=?, save_wis=?, save_cha=?, notes=?, updated_at=? WHERE id=?",
			t.Name, t.HPMax, t.AC, t.Speed, t.Initiative,
			t.SaveSTR, t.SaveDEX, t.SaveCON, t.SaveINT, t.SaveWIS, t.SaveCHA,
			t.Notes, t.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update critter template")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "critter template not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", id, "update", diffJSON)
	}

	idInt, _ := strconv.Atoi(id)
	t.ID = idInt
	writeJSON(w, http.StatusOK, t)
}

func handleDeleteCritterTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM critter_templates WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete critter template")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "critter template not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}
```

Note: The `database/sql` import is needed for `diffUpdate`'s callback signature (`func(tx *sql.Tx) (sql.Result, error)`).

- [ ] **Step 2: Register template routes in routes.go**

Add these lines in `backend/internal/api/routes.go` alongside the existing critter routes:

```go
	// Critter template routes
	mux.Handle("GET /api/v1/critter-templates", auth(handleListCritterTemplates))
	mux.Handle("POST /api/v1/critter-templates", auth(handleCreateCritterTemplate))
	mux.Handle("PUT /api/v1/critter-templates/{id}", auth(handleUpdateCritterTemplate))
	mux.Handle("DELETE /api/v1/critter-templates/{id}", auth(handleDeleteCritterTemplate))
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/critter_templates.go backend/internal/api/routes.go
git commit -m "Add critter template CRUD endpoints"
```

---

### Task 4: Update Critter Handlers for Instance Model

**Files:**
- Modify: `backend/internal/api/critters.go`

- [ ] **Step 1: Update handleListCritters**

Replace the query and scan to include new columns:

```go
func handleListCritters(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(
		"SELECT id, name, template_id, character_id, instance_number, hp_current, hp_max, ac, speed, initiative, save_str, save_dex, save_con, save_int, save_wis, save_cha, notes, active, created_at, updated_at FROM critters ORDER BY name, instance_number",
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query critters")
		return
	}
	defer rows.Close()

	critters := []types.Critter{}
	for rows.Next() {
		var c types.Critter
		if err := rows.Scan(&c.ID, &c.Name, &c.TemplateID, &c.CharacterID, &c.InstanceNumber,
			&c.HPCurrent, &c.HPMax, &c.AC, &c.Speed, &c.Initiative,
			&c.SaveSTR, &c.SaveDEX, &c.SaveCON, &c.SaveINT, &c.SaveWIS, &c.SaveCHA,
			&c.Notes, &c.Active, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		critters = append(critters, c)
	}
	writeJSON(w, http.StatusOK, critters)
}
```

- [ ] **Step 2: Replace handleCreateCritter with summon logic**

Replace `handleCreateCritter` to accept a `SummonRequest`, look up the template, copy stats, and auto-assign instance number:

```go
func handleCreateCritter(w http.ResponseWriter, r *http.Request) {
	var req types.SummonRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Look up template
	var t types.CritterTemplate
	err := db.DB.QueryRow(
		"SELECT id, name, hp_max, ac, speed, initiative, save_str, save_dex, save_con, save_int, save_wis, save_cha, notes FROM critter_templates WHERE id = ?",
		req.TemplateID,
	).Scan(&t.ID, &t.Name, &t.HPMax, &t.AC, &t.Speed, &t.Initiative,
		&t.SaveSTR, &t.SaveDEX, &t.SaveCON, &t.SaveINT, &t.SaveWIS, &t.SaveCHA, &t.Notes)
	if err != nil {
		writeError(w, http.StatusNotFound, "critter template not found")
		return
	}

	// Use transaction to safely assign instance number + insert
	now := time.Now()
	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	var maxInstance int
	tx.QueryRow("SELECT COALESCE(MAX(instance_number), 0) FROM critters WHERE name = ?", t.Name).Scan(&maxInstance)

	c := types.Critter{
		Name:           t.Name,
		TemplateID:     &t.ID,
		CharacterID:    req.CharacterID,
		InstanceNumber: maxInstance + 1,
		HPCurrent:      t.HPMax,
		HPMax:          t.HPMax,
		AC:             t.AC,
		Speed:          t.Speed,
		Initiative:     t.Initiative,
		SaveSTR:        t.SaveSTR,
		SaveDEX:        t.SaveDEX,
		SaveCON:        t.SaveCON,
		SaveINT:        t.SaveINT,
		SaveWIS:        t.SaveWIS,
		SaveCHA:        t.SaveCHA,
		Notes:          t.Notes,
		Active:         true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	result, err := tx.Exec(
		"INSERT INTO critters (name, template_id, character_id, instance_number, hp_current, hp_max, ac, speed, initiative, save_str, save_dex, save_con, save_int, save_wis, save_cha, notes, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		c.Name, c.TemplateID, c.CharacterID, c.InstanceNumber,
		c.HPCurrent, c.HPMax, c.AC, c.Speed, c.Initiative,
		c.SaveSTR, c.SaveDEX, c.SaveCON, c.SaveINT, c.SaveWIS, c.SaveCHA,
		c.Notes, c.Active, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to summon critter: %v", err))
		return
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit summon")
		return
	}
	id, _ := result.LastInsertId()
	c.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", strconv.Itoa(c.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, c)
}
```

- [ ] **Step 3: Update handleUpdateCritter**

Update the SQL to include all new columns:

```go
func handleUpdateCritter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Critter
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	c.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("critters", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE critters SET name=?, character_id=?, hp_current=?, hp_max=?, ac=?, speed=?, initiative=?, save_str=?, save_dex=?, save_con=?, save_int=?, save_wis=?, save_cha=?, notes=?, updated_at=? WHERE id=?",
			c.Name, c.CharacterID, c.HPCurrent, c.HPMax, c.AC, c.Speed, c.Initiative,
			c.SaveSTR, c.SaveDEX, c.SaveCON, c.SaveINT, c.SaveWIS, c.SaveCHA,
			c.Notes, c.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update critter")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "critter not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", id, "update", diffJSON)
	}

	idInt, _ := strconv.Atoi(id)
	c.ID = idInt
	writeJSON(w, http.StatusOK, c)
}
```

- [ ] **Step 4: Update handleDismissAllCritters to hard-delete**

Replace the soft-delete with a hard delete:

```go
func handleDismissAllCritters(w http.ResponseWriter, r *http.Request) {
	result, err := db.DB.Exec("DELETE FROM critters")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to dismiss all critters")
		return
	}
	n, _ := result.RowsAffected()
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", "all", "delete", fmt.Sprintf(`{"count":%d}`, n))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "all dismissed"})
}
```

- [ ] **Step 5: Verify it compiles**

Run: `cd backend && go build ./...`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/api/critters.go
git commit -m "Update critter handlers for template-based summon model"
```

---

## Chunk 2: Frontend — Types, Stores, Template Store

### Task 5: Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add CritterTemplate interface and update Critter**

Add the `CritterTemplate` interface and `SummonRequest` type. Update `Critter` to include new fields:

```typescript
export interface CritterTemplate {
  id: number
  name: string
  hp_max: number
  ac: number
  speed: number
  initiative: number
  save_str: number
  save_dex: number
  save_con: number
  save_int: number
  save_wis: number
  save_cha: number
  notes: string
  created_at: string
  updated_at: string
}

export interface Critter {
  id: number
  name: string
  template_id: number | null
  character_id: string
  instance_number: number
  hp_current: number
  hp_max: number
  ac: number
  speed: number
  initiative: number
  save_str: number
  save_dex: number
  save_con: number
  save_int: number
  save_wis: number
  save_cha: number
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface SummonRequest {
  template_id: number
  character_id: string
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: Type errors in existing critter code (expected — store/page reference old shape). We'll fix those in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "Add CritterTemplate type, extend Critter with new fields"
```

---

### Task 6: Critter Template Store

**Files:**
- Create: `frontend/src/stores/useCritterTemplateStore.ts`

- [ ] **Step 1: Create the template store**

Create `frontend/src/stores/useCritterTemplateStore.ts`:

```typescript
import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { CritterTemplate } from '../types'

interface CritterTemplateState {
  templates: CritterTemplate[]
  loading: boolean
  error: string | null

  fetchTemplates: () => Promise<void>
  createTemplate: (template: Partial<CritterTemplate>) => Promise<CritterTemplate>
  updateTemplate: (id: number, template: Partial<CritterTemplate>) => Promise<CritterTemplate>
  deleteTemplate: (id: number) => Promise<void>
}

export const useCritterTemplateStore = create<CritterTemplateState>((set) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const templates = await api.get<CritterTemplate[]>('/critter-templates')
      set({ templates, loading: false })
    } catch (err) {
      const msg = 'Failed to fetch critter templates'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  createTemplate: async (template) => {
    const created = await api.post<CritterTemplate>('/critter-templates', template)
    set((state) => ({ templates: [...state.templates, created] }))
    return created
  },

  updateTemplate: async (id, template) => {
    const updated = await api.put<CritterTemplate>(`/critter-templates/${id}`, template)
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? updated : t)),
    }))
    return updated
  },

  deleteTemplate: async (id) => {
    await api.del(`/critter-templates/${id}`)
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }))
  },
}))
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: No errors in the new store file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/useCritterTemplateStore.ts
git commit -m "Add critter template Zustand store"
```

---

### Task 7: Update Critter Store for Summon Model

**Files:**
- Modify: `frontend/src/stores/useCritterStore.ts`

- [ ] **Step 1: Update the store**

Replace the store to use the summon model. Key changes:
- `createCritter` → `summonCritter` accepting `SummonRequest`
- Remove `?active=true` filter (no more soft-delete)
- Keep `updateCritter`, `deleteCritter`, `dismissAll`

```typescript
import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { Critter, SummonRequest } from '../types'

interface CritterState {
  critters: Critter[]
  loading: boolean
  error: string | null

  fetchCritters: () => Promise<void>
  summonCritter: (req: SummonRequest) => Promise<Critter>
  updateCritter: (id: number, critter: Partial<Critter>) => Promise<Critter>
  deleteCritter: (id: number) => Promise<void>
  dismissAll: () => Promise<void>
}

export const useCritterStore = create<CritterState>((set) => ({
  critters: [],
  loading: false,
  error: null,

  fetchCritters: async () => {
    set({ loading: true, error: null })
    try {
      const critters = await api.get<Critter[]>('/critters')
      set({ critters, loading: false })
    } catch (err) {
      const msg = 'Failed to fetch critters'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  summonCritter: async (req) => {
    const critter = await api.post<Critter>('/critters', req)
    set((state) => ({ critters: [...state.critters, critter] }))
    return critter
  },

  updateCritter: async (id, critter) => {
    const updated = await api.put<Critter>(`/critters/${id}`, critter)
    set((state) => ({
      critters: state.critters.map((c) => (c.id === id ? updated : c)),
    }))
    return updated
  },

  deleteCritter: async (id) => {
    await api.del(`/critters/${id}`)
    set((state) => ({
      critters: state.critters.filter((c) => c.id !== id),
    }))
  },

  dismissAll: async () => {
    await api.post('/critters/dismiss-all', {})
    set({ critters: [] })
  },
}))
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: Errors only in `CrittersPage.tsx` (references old store shape). Fixed in next chunk.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/useCritterStore.ts
git commit -m "Update critter store for summon-based model"
```

---

## Chunk 3: Frontend UI — Blueprint Dialog, Roster Sidebar, Instance Cards

### Task 8: Blueprint Form Dialog

**Files:**
- Create: `frontend/src/components/Critters/BlueprintDialog.tsx`

- [ ] **Step 1: Create the blueprint create/edit dialog**

Follow the `ItemFormModal.tsx` pattern. The dialog accepts an optional `template` prop for editing vs creating.

```typescript
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { CritterTemplate } from '../../types'

interface BlueprintDialogProps {
  template?: CritterTemplate | null
  onSave: (data: Partial<CritterTemplate>) => void
  onClose: () => void
}

export default function BlueprintDialog({ template, onSave, onClose }: BlueprintDialogProps) {
  const [name, setName] = useState('')
  const [hpMax, setHpMax] = useState('')
  const [ac, setAc] = useState('10')
  const [speed, setSpeed] = useState('30')
  const [initiative, setInitiative] = useState('0')
  const [saveStr, setSaveStr] = useState('0')
  const [saveDex, setSaveDex] = useState('0')
  const [saveCon, setSaveCon] = useState('0')
  const [saveInt, setSaveInt] = useState('0')
  const [saveWis, setSaveWis] = useState('0')
  const [saveCha, setSaveCha] = useState('0')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (template) {
      setName(template.name)
      setHpMax(String(template.hp_max))
      setAc(String(template.ac))
      setSpeed(String(template.speed))
      setInitiative(String(template.initiative))
      setSaveStr(String(template.save_str))
      setSaveDex(String(template.save_dex))
      setSaveCon(String(template.save_con))
      setSaveInt(String(template.save_int))
      setSaveWis(String(template.save_wis))
      setSaveCha(String(template.save_cha))
      setNotes(template.notes)
    }
  }, [template])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      hp_max: parseInt(hpMax) || 0,
      ac: parseInt(ac) || 10,
      speed: parseInt(speed) || 30,
      initiative: parseInt(initiative) || 0,
      save_str: parseInt(saveStr) || 0,
      save_dex: parseInt(saveDex) || 0,
      save_con: parseInt(saveCon) || 0,
      save_int: parseInt(saveInt) || 0,
      save_wis: parseInt(saveWis) || 0,
      save_cha: parseInt(saveCha) || 0,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-lg animate-[slideIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-parchment">
            {template ? 'Edit Blueprint' : 'New Blueprint'}
          </h2>
          <button onClick={onClose} className="text-parchment-muted hover:text-parchment">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-parchment-dim mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-themed w-full"
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-parchment-dim mb-1">HP Max</label>
              <input type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value)} className="input-themed w-full" required />
            </div>
            <div>
              <label className="block text-sm text-parchment-dim mb-1">AC</label>
              <input type="number" value={ac} onChange={(e) => setAc(e.target.value)} className="input-themed w-full" />
            </div>
            <div>
              <label className="block text-sm text-parchment-dim mb-1">Speed</label>
              <input type="number" value={speed} onChange={(e) => setSpeed(e.target.value)} className="input-themed w-full" />
            </div>
            <div>
              <label className="block text-sm text-parchment-dim mb-1">Initiative</label>
              <input type="number" value={initiative} onChange={(e) => setInitiative(e.target.value)} className="input-themed w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-parchment-dim mb-1">Save Bonuses</label>
            <div className="grid grid-cols-6 gap-2">
              {[
                ['STR', saveStr, setSaveStr],
                ['DEX', saveDex, setSaveDex],
                ['CON', saveCon, setSaveCon],
                ['INT', saveInt, setSaveInt],
                ['WIS', saveWis, setSaveWis],
                ['CHA', saveCha, setSaveCha],
              ].map(([label, value, setter]) => (
                <div key={label as string}>
                  <label className="block text-xs text-parchment-muted text-center mb-1">{label as string}</label>
                  <input
                    type="number"
                    value={value as string}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className="input-themed w-full text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-parchment-dim mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-themed w-full h-24 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-surface border border-border rounded-lg text-parchment-dim hover:text-parchment transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors">
              {template ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Note: All number inputs use `useState<string>` per CLAUDE.md convention.

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: No errors in the new component.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Critters/BlueprintDialog.tsx
git commit -m "Add blueprint create/edit dialog component"
```

---

### Task 9: Roster Sidebar Component

**Files:**
- Create: `frontend/src/components/Critters/RosterSidebar.tsx`

- [ ] **Step 1: Create the roster sidebar**

The sidebar lists all blueprints with summon and edit icons. Summon shows a character picker popover.

```typescript
import { useState, useRef, useEffect } from 'react'
import { Swords, Pencil, Trash2, Plus } from 'lucide-react'
import type { CritterTemplate, Character } from '../../types'

interface RosterSidebarProps {
  templates: CritterTemplate[]
  characters: Character[]
  onSummon: (templateId: number, characterId: string) => void
  onEdit: (template: CritterTemplate) => void
  onDelete: (templateId: number) => void
  onNew: () => void
}

export default function RosterSidebar({ templates, characters, onSummon, onEdit, onDelete, onNew }: RosterSidebarProps) {
  const [summonPickerId, setSummonPickerId] = useState<number | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setSummonPickerId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-56 flex-shrink-0 border-r border-border pr-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-parchment-dim uppercase tracking-wide">Roster</h3>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gold/15 text-gold rounded hover:bg-gold/25 transition-colors"
        >
          <Plus size={12} /> New
        </button>
      </div>

      <div className="space-y-1.5">
        {templates.map((t) => (
          <div key={t.id} className="relative">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-surface rounded-lg group">
              <span className="text-sm text-parchment truncate">{t.name}</span>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(t)}
                  className="p-1 hover:text-gold transition-colors"
                  title="Edit blueprint"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="p-1 hover:text-wine transition-colors"
                  title="Delete blueprint"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => setSummonPickerId(summonPickerId === t.id ? null : t.id)}
                  className="p-1 text-emerald hover:text-emerald/80 transition-colors"
                  title="Summon"
                >
                  <Swords size={14} />
                </button>
              </div>
            </div>

            {summonPickerId === t.id && (
              <div ref={pickerRef} className="absolute right-0 top-full mt-1 z-40 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[140px]">
                <p className="text-xs text-parchment-muted mb-1.5 px-1">Summon for:</p>
                {characters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSummon(t.id, ch.id)
                      setSummonPickerId(null)
                    }}
                    className="block w-full text-left px-2 py-1 text-sm text-parchment rounded hover:bg-surface transition-colors"
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <p className="text-xs text-parchment-muted italic px-2">No blueprints yet</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: No errors in the new component.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Critters/RosterSidebar.tsx
git commit -m "Add roster sidebar component with summon picker"
```

---

### Task 10: Instance Card Component

**Files:**
- Create: `frontend/src/components/Critters/CritterCard.tsx`

- [ ] **Step 1: Create the instance card**

Compact card with HP bar, +/-1 buttons, number input for larger adjustments, stat badges, collapsible notes, and owner reassignment.

```typescript
import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import type { Critter, Character } from '../../types'

interface CritterCardProps {
  critter: Critter
  characters: Character[]
  onUpdate: (id: number, data: Partial<Critter>) => void
  onDismiss: (id: number) => void
}

export default function CritterCard({ critter, characters, onUpdate, onDismiss }: CritterCardProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [hpDelta, setHpDelta] = useState('')
  const [showOwnerPicker, setShowOwnerPicker] = useState(false)

  const pct = critter.hp_max > 0 ? (critter.hp_current / critter.hp_max) * 100 : 0
  const ownerName = characters.find((c) => c.id === critter.character_id)?.name ?? critter.character_id
  const displayName = `${critter.name} ${critter.instance_number}`

  const adjustHP = (delta: number) => {
    const newHP = Math.max(0, Math.min(critter.hp_max, critter.hp_current + delta))
    onUpdate(critter.id, { ...critter, hp_current: newHP })
  }

  const applyHPDelta = (mode: 'damage' | 'heal') => {
    const val = parseInt(hpDelta)
    if (isNaN(val) || val <= 0) return
    adjustHP(mode === 'damage' ? -val : val)
    setHpDelta('')
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-parchment">{displayName}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOwnerPicker(!showOwnerPicker)}
            className="text-xs text-parchment-muted hover:text-parchment transition-colors"
          >
            {ownerName}
          </button>
          <button
            onClick={() => onDismiss(critter.id)}
            className="p-0.5 text-parchment-muted hover:text-wine transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Owner picker */}
      {showOwnerPicker && (
        <div className="mb-2 p-2 bg-card border border-border rounded-lg">
          <p className="text-xs text-parchment-muted mb-1">Reassign to:</p>
          {characters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                onUpdate(critter.id, { ...critter, character_id: ch.id })
                setShowOwnerPicker(false)
              }}
              className={clsx(
                'block w-full text-left px-2 py-0.5 text-sm rounded transition-colors',
                ch.id === critter.character_id ? 'text-gold' : 'text-parchment hover:bg-surface'
              )}
            >
              {ch.name}
            </button>
          ))}
        </div>
      )}

      {/* HP bar with +/- buttons */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => adjustHP(-1)}
          className="px-2 py-0.5 bg-wine/15 text-wine rounded font-bold text-sm hover:bg-wine/25 transition-colors"
        >
          -
        </button>
        <div className="flex-1">
          <div className="text-center font-mono text-sm font-bold text-parchment">
            {critter.hp_current} / {critter.hp_max}
          </div>
          <div className="w-full bg-card rounded-full h-2 mt-0.5 border border-border">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                pct > 50 ? 'bg-emerald' : pct > 25 ? 'bg-amber' : 'bg-wine'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => adjustHP(1)}
          className="px-2 py-0.5 bg-emerald/15 text-emerald rounded font-bold text-sm hover:bg-emerald/25 transition-colors"
        >
          +
        </button>
      </div>

      {/* HP number input with damage/heal */}
      <div className="flex items-center gap-1.5 mb-2">
        <input
          type="number"
          value={hpDelta}
          onChange={(e) => setHpDelta(e.target.value)}
          placeholder="HP"
          className="input-themed w-16 text-center text-sm py-0.5"
          min="1"
        />
        <button
          onClick={() => applyHPDelta('damage')}
          className="px-2 py-0.5 text-xs bg-wine/15 text-wine rounded hover:bg-wine/25 transition-colors"
        >
          Damage
        </button>
        <button
          onClick={() => applyHPDelta('heal')}
          className="px-2 py-0.5 text-xs bg-emerald/15 text-emerald rounded hover:bg-emerald/25 transition-colors"
        >
          Heal
        </button>
      </div>

      {/* Stat badges */}
      <div className="flex gap-2 text-xs text-parchment-dim mb-1.5">
        <span>AC {critter.ac}</span>
        <span>Spd {critter.speed}</span>
        <span>Init {critter.initiative >= 0 ? '+' : ''}{critter.initiative}</span>
      </div>

      {/* Save bonuses */}
      <div className="flex gap-1.5 text-xs text-parchment-muted">
        {[
          ['S', critter.save_str],
          ['D', critter.save_dex],
          ['C', critter.save_con],
          ['I', critter.save_int],
          ['W', critter.save_wis],
          ['Ch', critter.save_cha],
        ].map(([label, val]) => (
          <span key={label as string}>
            {label}{(val as number) >= 0 ? '+' : ''}{val}
          </span>
        ))}
      </div>

      {/* Collapsible notes */}
      {critter.notes && (
        <div className="mt-2 border-t border-border pt-1.5">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-parchment-muted hover:text-parchment transition-colors"
          >
            {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Notes
          </button>
          {showNotes && (
            <p className="text-xs text-parchment-dim mt-1 whitespace-pre-wrap">{critter.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Critters/CritterCard.tsx
git commit -m "Add critter instance card component with HP controls"
```

---

### Task 11: Rewrite CrittersPage

**Files:**
- Modify: `frontend/src/pages/CrittersPage.tsx`

- [ ] **Step 1: Rewrite the page with sidebar + grid layout**

Replace the entire `CrittersPage.tsx` with the new layout. Imports both stores, composes the sidebar, grid, and dialog.

```typescript
import { useEffect, useState } from 'react'
import { Skull, Swords } from 'lucide-react'
import { toast } from '../stores/useToastStore'
import { useCritterStore } from '../stores/useCritterStore'
import { useCritterTemplateStore } from '../stores/useCritterTemplateStore'
import { useInventoryStore } from '../stores/useInventoryStore'
import { confirm } from '../stores/useConfirmStore'
import RosterSidebar from '../components/Critters/RosterSidebar'
import CritterCard from '../components/Critters/CritterCard'
import BlueprintDialog from '../components/Critters/BlueprintDialog'
import type { CritterTemplate } from '../types'

export function CrittersPage() {
  const { critters, fetchCritters, summonCritter, updateCritter, deleteCritter, dismissAll, loading } = useCritterStore()
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useCritterTemplateStore()
  const { characters, fetchCharacters } = useInventoryStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CritterTemplate | null>(null)

  useEffect(() => {
    fetchCritters()
    fetchTemplates()
    fetchCharacters()
  }, [fetchCritters, fetchTemplates, fetchCharacters])

  const handleSummon = async (templateId: number, characterId: string) => {
    try {
      await summonCritter({ template_id: templateId, character_id: characterId })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to summon critter')
    }
  }

  const handleSaveBlueprint = async (data: Partial<CritterTemplate>) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data)
      } else {
        await createTemplate(data)
      }
      setDialogOpen(false)
      setEditingTemplate(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save blueprint')
    }
  }

  const handleDeleteBlueprint = async (id: number) => {
    if (await confirm('Delete this blueprint? Active instances will not be affected.')) {
      try {
        await deleteTemplate(id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete blueprint')
      }
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await deleteCritter(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to dismiss critter')
    }
  }

  const handleDismissAll = async () => {
    if (await confirm('Dismiss all active critters?')) {
      try {
        await dismissAll()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to dismiss all')
      }
    }
  }

  const handleUpdate = async (id: number, data: Partial<typeof critters[0]>) => {
    try {
      await updateCritter(id, data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update critter')
    }
  }

  if (loading) return <div className="p-6 text-parchment-dim">Loading...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-parchment flex items-center gap-2">
          <Skull size={24} /> Critters
        </h1>
        {critters.length > 0 && (
          <button
            onClick={handleDismissAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-wine/15 text-wine rounded-lg hover:bg-wine/25 transition-colors"
          >
            <Swords size={14} /> Dismiss All
          </button>
        )}
      </div>

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-4">
        <RosterSidebar
          templates={templates}
          characters={characters}
          onSummon={handleSummon}
          onEdit={(t) => {
            setEditingTemplate(t)
            setDialogOpen(true)
          }}
          onDelete={handleDeleteBlueprint}
          onNew={() => {
            setEditingTemplate(null)
            setDialogOpen(true)
          }}
        />

        {/* Instance grid */}
        <div className="flex-1">
          {critters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {critters.map((c) => (
                <CritterCard
                  key={c.id}
                  critter={c}
                  characters={characters}
                  onUpdate={handleUpdate}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-parchment-muted">
              No critters summoned — use the roster to summon one
            </div>
          )}
        </div>
      </div>

      {/* Blueprint dialog */}
      {dialogOpen && (
        <BlueprintDialog
          template={editingTemplate}
          onSave={handleSaveBlueprint}
          onClose={() => {
            setDialogOpen(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify everything compiles and renders**

Run: `cd frontend && pnpm typecheck && pnpm build`
Expected: No type errors, clean build.

- [ ] **Step 3: Manual smoke test**

Run: `make dev`
- Navigate to `/critters`
- Create a blueprint via "+ New" in the sidebar
- Summon 2 instances of the same blueprint for different characters
- Verify instance numbering (Wolf 1, Wolf 2)
- Test HP +/-1 buttons and damage/heal input
- Test owner reassignment by clicking owner name
- Test dismiss (single and all)
- Edit a blueprint and verify existing instances are unchanged
- Delete a blueprint and verify instances persist

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CrittersPage.tsx
git commit -m "Rewrite critters page with roster sidebar and instance grid"
```

---

## Chunk 4: Cleanup and Export

### Task 12: Update JSON Export/Restore

**Files:**
- Check: `backend/cmd/export/main.go`
- Check: `backend/cmd/seed/main.go`

- [ ] **Step 1: Check if export includes critter_templates**

Read `backend/cmd/export/main.go` and verify it exports all tables. If it uses a dynamic table list (likely), `critter_templates` will be picked up automatically by the migration. If it has a hardcoded list, add `critter_templates`.

- [ ] **Step 2: Test export/restore cycle**

Run: `make export && make restore`
Expected: No errors. Exported JSON includes `critter_templates` data.

- [ ] **Step 3: Commit if changes needed**

```bash
git add backend/cmd/export/main.go
git commit -m "Add critter_templates to export"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run backend checks**

```bash
cd backend && go vet ./... && go build ./...
```
Expected: No warnings or errors.

- [ ] **Step 2: Run frontend checks**

```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm build
```
Expected: Clean.

- [ ] **Step 3: Full manual test**

Run: `make dev`
Walk through the complete flow: create blueprint → summon multiple → adjust HP → reassign owner → dismiss → dismiss all → edit blueprint → delete blueprint.

- [ ] **Step 4: Final commit if any fixes needed**
