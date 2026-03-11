# Icon Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players pick their character icon from a popover on the character card, and fix the bug where icons get cleared on character update.

**Architecture:** Backend fix preserves existing icon when update payload omits it. New `IconPicker` React component renders a popover grid of Lucide icons on the character card, with taken icons dimmed. Uses existing Zustand store and `updateCharacter` API — no new endpoints.

**Tech Stack:** Go backend (stdlib net/http), React + TypeScript + Tailwind CSS + Zustand + Lucide React

**Spec:** `docs/superpowers/specs/2026-03-11-icon-picker-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/internal/api/characters.go:108-122` | Preserve icon on update when empty |
| Modify | `frontend/src/constants/characterIcons.ts` | Export `ICON_MAP` |
| Create | `frontend/src/components/IconPicker.tsx` | Popover icon grid component |
| Modify | `frontend/src/pages/CharactersPage.tsx:138-143` | Wire up IconPicker on character card |

---

## Chunk 1: Backend Fix + Frontend Icon Picker

### Task 1: Fix backend — preserve icon on character update

**Files:**
- Modify: `backend/internal/api/characters.go:108-122`

- [ ] **Step 1: Add icon preservation logic**

In `handleUpdateCharacter`, after reading the JSON body (line 114) and before setting `UpdatedAt` (line 116), add a guard that loads the existing icon when the payload sends an empty one:

```go
	if c.Icon == "" {
		var existingIcon string
		err := db.DB.QueryRow("SELECT icon FROM characters WHERE id = ?", id).Scan(&existingIcon)
		if err == nil {
			c.Icon = existingIcon
		}
	}
```

Insert this between line 114 (`return`) closing brace and line 116 (`c.UpdatedAt = time.Now()`).

- [ ] **Step 2: Verify the fix**

Run: `cd backend && go vet ./...`
Expected: no errors

- [ ] **Step 3: Manual smoke test**

Run: `cd backend && go build ./...`
Expected: compiles cleanly

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/characters.go
git commit -m "Fix icon cleared on character update"
```

---

### Task 2: Export ICON_MAP from characterIcons.ts

**Files:**
- Modify: `frontend/src/constants/characterIcons.ts`

- [ ] **Step 1: Export the ICON_MAP constant**

Change line 8 from:
```ts
const ICON_MAP: Record<string, LucideIcon> = {
```
to:
```ts
export const ICON_MAP: Record<string, LucideIcon> = {
```

- [ ] **Step 2: Verify no type errors**

Run: `cd frontend && pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants/characterIcons.ts
git commit -m "Export ICON_MAP for use by IconPicker"
```

---

### Task 3: Create IconPicker component

**Files:**
- Create: `frontend/src/components/IconPicker.tsx`

- [ ] **Step 1: Create the IconPicker component**

```tsx
import { useEffect, useRef } from 'react'
import { ICON_MAP } from '../constants/characterIcons'

interface IconPickerProps {
  characterId: string
  currentIcon: string
  usedIcons: Record<string, string>  // icon name → character ID
  onSelect: (iconName: string) => void
  onClose: () => void
}

export function IconPicker({ characterId, currentIcon, usedIcons, onSelect, onClose }: IconPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const iconNames = Object.keys(ICON_MAP)

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg p-2 shadow-lg"
    >
      <div className="text-xs text-parchment-muted uppercase tracking-wide mb-2">Choose Icon</div>
      <div className="grid grid-cols-4 gap-1.5">
        {iconNames.map((name) => {
          const Icon = ICON_MAP[name]
          const isCurrent = name === currentIcon
          const takenBy = usedIcons[name]
          const isTaken = takenBy && takenBy !== characterId

          return (
            <button
              key={name}
              onClick={() => { if (!isTaken) onSelect(name) }}
              disabled={!!isTaken}
              className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${
                isCurrent
                  ? 'bg-gold text-base'
                  : isTaken
                    ? 'bg-surface text-parchment-muted opacity-30 cursor-not-allowed'
                    : 'bg-card hover:bg-card-hover text-parchment-dim'
              }`}
              title={isTaken ? `${name} (taken)` : name}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd frontend && pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/IconPicker.tsx
git commit -m "Add IconPicker popover component"
```

---

### Task 4: Wire IconPicker into CharactersPage

**Files:**
- Modify: `frontend/src/pages/CharactersPage.tsx`

- [ ] **Step 1: Add state and derived data**

Add imports at the top of the file:
```tsx
import { IconPicker } from '../components/IconPicker'
```

Inside the `CharactersPage` component, add state for tracking which character's picker is open:
```tsx
const [iconPickerCharId, setIconPickerCharId] = useState<string | null>(null)
```

Add a `useMemo` to derive used icons from the characters array:
```tsx
const usedIcons = useMemo(
  () => Object.fromEntries(characters.filter(c => c.icon).map(c => [c.icon, c.id])),
  [characters]
)
```

- [ ] **Step 2: Replace the icon render on the character card**

Find the icon render block on the character card (lines 140-142):
```tsx
<div className="flex items-center gap-2">
  {(() => { const Icon = getCharacterIcon(c.icon); return <Icon className="w-5 h-5 text-gold" /> })()}
  <h3 className="font-heading text-lg font-bold text-parchment">{c.name}</h3>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-2">
  <div className="relative">
    <button
      onClick={() => setIconPickerCharId(iconPickerCharId === c.id ? null : c.id)}
      className="p-0.5 rounded hover:bg-card-hover transition-colors"
      title="Change icon"
    >
      {(() => { const Icon = getCharacterIcon(c.icon); return <Icon className="w-5 h-5 text-gold" /> })()}
    </button>
    {iconPickerCharId === c.id && (
      <IconPicker
        characterId={c.id}
        currentIcon={c.icon}
        usedIcons={usedIcons}
        onSelect={async (iconName) => {
          try {
            await updateCharacter(c.id, { ...c, icon: iconName })
            setIconPickerCharId(null)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update icon')
          }
        }}
        onClose={() => setIconPickerCharId(null)}
      />
    )}
  </div>
  <h3 className="font-heading text-lg font-bold text-parchment">{c.name}</h3>
</div>
```

- [ ] **Step 3: Verify no type errors**

Run: `cd frontend && pnpm typecheck`
Expected: no errors

- [ ] **Step 4: Visual smoke test**

Run: `make dev`
1. Open the Characters page
2. Click an icon on a character card — popover should appear with 14 icons in a 4×4 grid (last row has 2)
3. Current icon should be gold-highlighted
4. Icons belonging to other characters should be dimmed
5. Click an available icon — it should update and the popover should close
6. Click outside or press Escape — popover should close
7. Edit a character (name, class, etc.) and save — icon should be preserved

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CharactersPage.tsx
git commit -m "Wire IconPicker into character cards"
```

---

### Task 5: Update TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark the icon assignment todo as done**

Change line 8 from:
```
- [ ] Fix character icon assignment #bug #ux
```
to:
```
- [x] Fix character icon assignment #bug #ux
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "Mark icon picker todo as done"
```
