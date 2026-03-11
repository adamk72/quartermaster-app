# Inline Editing (Container & Labels) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to click Container and Labels cells in the inventory table to edit them inline via dropdowns, with auto-save behavior and optimistic locking.

**Architecture:** Two new components (`InlineContainerSelect` and `InlineLabelSelect`) render as positioned dropdowns when a cell is clicked. They call the existing `updateItem` store method, which handles 409 conflicts. A shared `useClickOutside` hook manages dismissal. The InventoryPage tracks which cell is being edited via state.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand 5, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-10-inline-editing-design.md`

---

## File Structure

- **Create:** `frontend/src/components/Inventory/InlineContainerSelect.tsx` — dropdown for picking a container
- **Create:** `frontend/src/components/Inventory/InlineLabelSelect.tsx` — multi-select checklist for labels
- **Create:** `frontend/src/hooks/useClickOutside.ts` — shared hook for click-outside dismissal
- **Modify:** `frontend/src/pages/InventoryPage.tsx` — replace static Container/Labels cells with clickable inline editors

---

## Chunk 1: Shared Hook & InlineContainerSelect

### Task 1: useClickOutside Hook

**Files:**
- Create: `frontend/src/hooks/useClickOutside.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(onClickOutside: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClickOutside])

  return ref
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useClickOutside.ts
git commit -m "Add useClickOutside hook"
```

### Task 2: InlineContainerSelect Component

**Files:**
- Create: `frontend/src/components/Inventory/InlineContainerSelect.tsx`

**Context needed:**
- `Container` type from `frontend/src/types/index.ts:24-38` — has `id`, `name`, `type`, `character_id`, `mount_id`
- `getContainerDisplayName` function in `frontend/src/pages/InventoryPage.tsx:45-50` — formats container name with owner prefix
- `useInventoryStore` from `frontend/src/stores/useInventoryStore.ts` — `updateItem(id, data)` method handles PUT + 409 conflicts
- `Character` and `Mount` types for display name resolution

- [ ] **Step 3: Create InlineContainerSelect**

```tsx
import { useCallback } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Check } from 'lucide-react'
import type { Container, Character, Mount } from '../../types'

interface Props {
  itemId: number
  itemVersion: number
  currentContainerId: string | null
  containers: Container[]
  characters: Character[]
  mounts: Mount[]
  getContainerDisplayName: (container: Container) => string
  onSave: (itemId: number, data: { container_id: string | null; version: number }) => Promise<unknown>
  onClose: () => void
}

export function InlineContainerSelect({
  itemId,
  itemVersion,
  currentContainerId,
  containers,
  characters,
  mounts,
  getContainerDisplayName,
  onSave,
  onClose,
}: Props) {
  const ref = useClickOutside<HTMLDivElement>(onClose)

  const handleSelect = useCallback(
    async (containerId: string | null) => {
      if (containerId === currentContainerId) {
        onClose()
        return
      }
      try {
        await onSave(itemId, { container_id: containerId, version: itemVersion })
      } catch {
        // updateItem already handles 409 toast + refetch
      }
      onClose()
    },
    [itemId, itemVersion, currentContainerId, onSave, onClose],
  )

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto"
    >
      {containers.map((c) => (
        <button
          key={c.id}
          onClick={() => handleSelect(c.id)}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors"
        >
          {c.id === currentContainerId && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
          <span className={c.id === currentContainerId ? 'text-gold font-medium' : 'text-parchment-dim'}>
            {getContainerDisplayName(c)}
          </span>
        </button>
      ))}
      <button
        onClick={() => handleSelect(null)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors text-parchment-muted"
      >
        {currentContainerId === null && <Check className="w-3.5 h-3.5 text-gold shrink-0" />}
        <span>— None —</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd frontend && pnpm typecheck`
Expected: No errors related to InlineContainerSelect

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Inventory/InlineContainerSelect.tsx
git commit -m "Add InlineContainerSelect component"
```

### Task 3: Wire InlineContainerSelect into InventoryPage

**Files:**
- Modify: `frontend/src/pages/InventoryPage.tsx:487-491` (container `<td>` cell)

**What to change:**

1. Add state to track which item's container is being edited:
   ```tsx
   const [editingContainerId, setEditingContainerId] = useState<number | null>(null)
   ```
   Add this near the other state declarations around line 60-80.

2. Import InlineContainerSelect at the top of the file.

3. Replace the container `<td>` cell (lines 487-491) from:
   ```tsx
   <td className="text-xs text-parchment-dim">{(() => {
     const container = containers.find((c) => c.id === item.container_id)
     if (!container) return <span className="text-parchment-muted">--</span>
     return getContainerDisplayName(container, characters, mounts)
   })()}</td>
   ```
   To:
   ```tsx
   <td className="relative text-xs text-parchment-dim">
     <button
       onClick={() => setEditingContainerId(editingContainerId === item.id ? null : item.id)}
       className="group cursor-pointer hover:bg-gold/5 -mx-2 -my-1 px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
     >
       {(() => {
         const container = containers.find((c) => c.id === item.container_id)
         if (!container) return <span className="text-parchment-muted">--</span>
         return <span className="border-b border-dashed border-parchment-muted/30 group-hover:border-gold/50">{getContainerDisplayName(container, characters, mounts)}</span>
       })()}
       <ChevronDown className="w-3 h-3 text-parchment-muted/30 group-hover:text-gold/50" />
     </button>
     {editingContainerId === item.id && (
       <InlineContainerSelect
         itemId={item.id}
         itemVersion={item.version}
         currentContainerId={item.container_id}
         containers={containers}
         characters={characters}
         mounts={mounts}
         getContainerDisplayName={(c) => getContainerDisplayName(c, characters, mounts)}
         onSave={updateItem}
         onClose={() => setEditingContainerId(null)}
       />
     )}
   </td>
   ```

- [ ] **Step 6: Add state and import to InventoryPage**

Add `import { InlineContainerSelect } from '../components/Inventory/InlineContainerSelect'` to the imports.

Add `const [editingContainerId, setEditingContainerId] = useState<number | null>(null)` near the other `useState` declarations.

- [ ] **Step 7: Replace container cell with inline editor**

Replace the container `<td>` as described above.

- [ ] **Step 8: Verify it compiles**

Run: `cd frontend && pnpm typecheck`
Expected: No type errors

- [ ] **Step 9: Manual test**

Run: `make dev`
1. Open the inventory page
2. Hover over a container cell — should see dashed underline and ▼ caret
3. Click a container cell — dropdown should appear with containers listed
4. Current container should have a ✓ checkmark
5. Select a different container — should save immediately (item updates in table)
6. Click outside an open dropdown — should close without saving

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/InventoryPage.tsx
git commit -m "Wire InlineContainerSelect into inventory table"
```

---

## Chunk 2: InlineLabelSelect & Integration

### Task 4: InlineLabelSelect Component

**Files:**
- Create: `frontend/src/components/Inventory/InlineLabelSelect.tsx`

**Context needed:**
- `Label` type from `frontend/src/types/index.ts:50-58` — has `id`, `name`, `color`, `text_color`, `sort_order`
- `hexWithAlpha` from `frontend/src/constants.ts` — creates hex color with alpha suffix
- `useLabelStore` from `frontend/src/stores/useLabelStore.ts` — `labels` array has all available labels
- `updateItem` sends `label_ids` (string array) via PUT

- [ ] **Step 1: Create InlineLabelSelect**

```tsx
import { useState, useCallback, useMemo } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { hexWithAlpha } from '../../constants'
import type { Label } from '../../types'

interface Props {
  itemId: number
  itemVersion: number
  currentLabels: Label[]
  allLabels: Label[]
  onSave: (itemId: number, data: { label_ids: string[]; version: number }) => Promise<unknown>
  onClose: () => void
}

export function InlineLabelSelect({
  itemId,
  itemVersion,
  currentLabels,
  allLabels,
  onSave,
  onClose,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(currentLabels.map((l) => l.id)),
  )
  const initialIds = useMemo(() => new Set(currentLabels.map((l) => l.id)), [currentLabels])

  const saveAndClose = useCallback(async () => {
    // Only save if labels actually changed
    const changed =
      selectedIds.size !== initialIds.size ||
      [...selectedIds].some((id) => !initialIds.has(id))
    if (changed) {
      try {
        await onSave(itemId, { label_ids: [...selectedIds], version: itemVersion })
      } catch {
        // updateItem already handles 409 toast + refetch
      }
    }
    onClose()
  }, [itemId, itemVersion, selectedIds, initialIds, onSave, onClose])

  const ref = useClickOutside<HTMLDivElement>(saveAndClose)

  const toggle = (labelId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(labelId)) next.delete(labelId)
      else next.add(labelId)
      return next
    })
  }

  const sorted = [...allLabels].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto"
    >
      {sorted.map((label) => (
        <button
          key={label.id}
          onClick={() => toggle(label.id)}
          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 flex items-center gap-2 transition-colors"
        >
          <span
            className="w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] shrink-0"
            style={{
              borderColor: selectedIds.has(label.id) ? '#c9a959' : 'rgba(160,160,184,0.3)',
              backgroundColor: selectedIds.has(label.id) ? 'rgba(201,169,89,0.2)' : 'transparent',
              color: '#c9a959',
            }}
          >
            {selectedIds.has(label.id) && '✓'}
          </span>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: hexWithAlpha(label.color, '40'), color: label.text_color || '#ffffff' }}
          >
            {label.name}
          </span>
        </button>
      ))}
      {sorted.length === 0 && (
        <div className="px-3 py-2 text-sm text-parchment-muted">No labels defined</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && pnpm typecheck`
Expected: No errors related to InlineLabelSelect

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Inventory/InlineLabelSelect.tsx
git commit -m "Add InlineLabelSelect component"
```

### Task 5: Wire InlineLabelSelect into InventoryPage

**Files:**
- Modify: `frontend/src/pages/InventoryPage.tsx:471-485` (labels `<td>` cell)

**What to change:**

1. Add state to track which item's labels are being edited:
   ```tsx
   const [editingLabelsId, setEditingLabelsId] = useState<number | null>(null)
   ```

2. Import InlineLabelSelect at the top.

3. Get `labels` from the label store:
   ```tsx
   const { labels: allLabels } = useLabelStore()
   ```
   This import and store access already exist in InventoryPage — verify it's accessible as `allLabels` or similar.

4. Replace the labels `<td>` cell (lines 471-485) from:
   ```tsx
   <td>
     <div className="flex flex-wrap gap-1">
       {item.labels?.map((l) => (
         <span
           key={l.id}
           className="px-2 py-0.5 rounded text-xs font-medium"
           style={{ backgroundColor: hexWithAlpha(l.color, '40'), color: l.text_color || '#ffffff' }}
         >
           {l.name}
         </span>
       ))}
       {(!item.labels || item.labels.length === 0) && (
         <span className="text-parchment-muted text-xs">--</span>
       )}
     </div>
   </td>
   ```
   To:
   ```tsx
   <td className="relative">
     <button
       onClick={() => setEditingLabelsId(editingLabelsId === item.id ? null : item.id)}
       className="cursor-pointer hover:bg-gold/5 -mx-2 -my-1 px-2 py-1 rounded transition-colors"
     >
       <div className="flex flex-wrap gap-1">
         {item.labels?.map((l) => (
           <span
             key={l.id}
             className="px-2 py-0.5 rounded text-xs font-medium"
             style={{ backgroundColor: hexWithAlpha(l.color, '40'), color: l.text_color || '#ffffff' }}
           >
             {l.name}
           </span>
         ))}
         {(!item.labels || item.labels.length === 0) && (
           <span className="text-parchment-muted text-xs">--</span>
         )}
       </div>
     </button>
     {editingLabelsId === item.id && (
       <InlineLabelSelect
         itemId={item.id}
         itemVersion={item.version}
         currentLabels={item.labels ?? []}
         allLabels={allLabels}
         onSave={updateItem}
         onClose={() => setEditingLabelsId(null)}
       />
     )}
   </td>
   ```

- [ ] **Step 4: Add state, import, and store access**

Add `import { InlineLabelSelect } from '../components/Inventory/InlineLabelSelect'` to imports.

Add `const [editingLabelsId, setEditingLabelsId] = useState<number | null>(null)` near other state.

Check how `useLabelStore` labels are accessed — the page already imports it. Look for the destructured variable name and use that for `allLabels` prop.

- [ ] **Step 5: Replace labels cell with inline editor**

Replace the labels `<td>` as described above.

- [ ] **Step 6: Close other editor when opening one**

Update both click handlers so opening one editor closes the other:

Container click handler:
```tsx
onClick={() => {
  setEditingLabelsId(null)
  setEditingContainerId(editingContainerId === item.id ? null : item.id)
}}
```

Labels click handler:
```tsx
onClick={() => {
  setEditingContainerId(null)
  setEditingLabelsId(editingLabelsId === item.id ? null : item.id)
}}
```

- [ ] **Step 7: Verify it compiles**

Run: `cd frontend && pnpm typecheck`
Expected: No type errors

- [ ] **Step 8: Manual test**

Run: `make dev`
1. Open the inventory page
2. Click a labels cell — checklist dropdown appears with all labels
3. Currently assigned labels have checkmarks
4. Toggle a label on — checkbox fills in
5. Toggle a label off — checkbox clears
6. Click outside — saves changes (verify item updates in table)
7. Click a labels cell then click a container cell — labels dropdown closes, container opens
8. Test with item that has no labels — shows "--", click opens dropdown, select label, saves
9. Test conflict: open two browser tabs, edit same item's container in both — second save should toast "modified by another user" and refetch

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/InventoryPage.tsx frontend/src/components/Inventory/InlineLabelSelect.tsx
git commit -m "Wire InlineLabelSelect into inventory table"
```
