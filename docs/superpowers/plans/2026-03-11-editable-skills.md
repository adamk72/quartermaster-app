# Editable Skills Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Skills Matrix page editable with click-only controls — up/down arrows for bonus, cycling badge for proficiency/expertise.

**Architecture:** Add edit mode toggle to existing `SkillsPage.tsx`. Local state holds draft edits keyed by `{characterId}_{skillName}`. On save, group edits by character and call the existing `PUT /api/v1/skills/{character_id}` endpoint per character. No backend changes needed.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing `api` client

---

## Chunk 1: Editable Skills UI

### Task 1: Add edit mode state and toggle button

**Files:**
- Modify: `frontend/src/pages/SkillsPage.tsx`

- [ ] **Step 1: Add edit mode state and draft skills map**

Add after the existing `useState` declarations (line 12):

```tsx
const [editing, setEditing] = useState(false)
const [draft, setDraft] = useState<Map<string, { bonus: number; proficient: boolean; expertise: boolean }>>(new Map())
```

- [ ] **Step 2: Add initDraft helper to populate draft from current skills**

Add after the `getMaxBonus` helper:

```tsx
const initDraft = () => {
  const d = new Map<string, { bonus: number; proficient: boolean; expertise: boolean }>()
  for (const c of characters) {
    for (const skillName of DND_SKILLS) {
      const skill = getSkill(c.id, skillName)
      d.set(`${c.id}_${skillName}`, {
        bonus: skill?.bonus ?? 0,
        proficient: skill?.proficient ?? false,
        expertise: skill?.expertise ?? false,
      })
    }
  }
  return d
}
```

- [ ] **Step 3: Add Edit/Cancel/Save buttons to the header**

Replace the existing `<h2>` (line 39) with:

```tsx
<div className="flex items-center justify-between mb-6">
  <h2 className="font-heading text-3xl font-bold text-parchment">Skill Matrix</h2>
  {editing ? (
    <div className="flex gap-2">
      <button
        className="px-4 py-1.5 text-sm rounded-lg border border-border text-parchment-muted hover:bg-surface"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
      <button
        className="px-4 py-1.5 text-sm rounded-lg bg-sky text-white font-semibold hover:bg-sky/80"
        onClick={handleSave}
      >
        Save All
      </button>
    </div>
  ) : (
    <button
      className="px-4 py-1.5 text-sm rounded-lg border border-border text-parchment-muted hover:bg-surface"
      onClick={() => { setDraft(initDraft()); setEditing(true) }}
    >
      Edit
    </button>
  )}
</div>
```

- [ ] **Step 4: Add handleSave function**

Add before the `return` statement:

```tsx
const [saving, setSaving] = useState(false)

const handleSave = async () => {
  setSaving(true)
  try {
    const byChar = new Map<string, { skill_name: string; bonus: number; proficient: boolean; expertise: boolean }[]>()
    for (const [key, val] of draft) {
      const [charId, ...rest] = key.split('_')
      const skillName = rest.join('_')
      if (!byChar.has(charId)) byChar.set(charId, [])
      byChar.get(charId)!.push({ skill_name: skillName, ...val })
    }
    await Promise.all(
      Array.from(byChar.entries()).map(([charId, skills]) =>
        api.put(`/skills/${charId}`, skills)
      )
    )
    const freshSkills = await api.get<Skill[]>('/skills')
    setSkills(freshSkills)
    setEditing(false)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to save skills')
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SkillsPage.tsx
git commit -m "Add edit mode toggle and save logic to skills page"
```

---

### Task 2: Replace read-only cells with edit controls in edit mode

**Files:**
- Modify: `frontend/src/pages/SkillsPage.tsx`

- [ ] **Step 1: Add draft update helpers**

Add after the `initDraft` helper:

```tsx
const getDraft = (charId: string, skillName: string) =>
  draft.get(`${charId}_${skillName}`)

const updateDraft = (charId: string, skillName: string, updates: Partial<{ bonus: number; proficient: boolean; expertise: boolean }>) => {
  setDraft((prev) => {
    const next = new Map(prev)
    const key = `${charId}_${skillName}`
    const current = next.get(key) ?? { bonus: 0, proficient: false, expertise: false }
    next.set(key, { ...current, ...updates })
    return next
  })
}

const cycleProficiency = (charId: string, skillName: string) => {
  const d = getDraft(charId, skillName)
  if (!d) return
  if (!d.proficient && !d.expertise) {
    updateDraft(charId, skillName, { proficient: true, expertise: false })
  } else if (d.proficient && !d.expertise) {
    updateDraft(charId, skillName, { proficient: false, expertise: true })
  } else {
    updateDraft(charId, skillName, { proficient: false, expertise: false })
  }
}
```

- [ ] **Step 2: Replace the character cell rendering with edit/view branching**

Replace the character cell `<td>` block (lines 63-74) with:

```tsx
{characters.map((c) => {
  if (editing) {
    const d = getDraft(c.id, skillName)
    const bonus = d?.bonus ?? 0
    const prof = d?.proficient ?? false
    const exp = d?.expertise ?? false
    return (
      <td key={c.id} className="text-center">
        <div className="flex items-center justify-center gap-1">
          <div className="flex flex-col items-center">
            <button
              className="text-[10px] text-parchment-muted hover:text-parchment leading-none px-1"
              onClick={() => updateDraft(c.id, skillName, { bonus: bonus + 1 })}
            >
              &#9650;
            </button>
            <span className="text-sm min-w-[28px] text-center">
              {bonus >= 0 ? `+${bonus}` : bonus}
            </span>
            <button
              className="text-[10px] text-parchment-muted hover:text-parchment leading-none px-1"
              onClick={() => updateDraft(c.id, skillName, { bonus: bonus - 1 })}
            >
              &#9660;
            </button>
          </div>
          <button
            className={clsx(
              'rounded px-1.5 py-0.5 text-[10px] font-bold min-w-[20px] text-center',
              exp ? 'bg-arcane text-white' :
              prof ? 'bg-sky text-white' :
              'bg-surface text-parchment-muted'
            )}
            onClick={() => cycleProficiency(c.id, skillName)}
          >
            {exp ? 'E' : prof ? 'P' : '–'}
          </button>
        </div>
      </td>
    )
  }
  const skill = getSkill(c.id, skillName)
  const bonus = skill?.bonus ?? 0
  const isMax = bonus > 0 && bonus === maxBonus
  return (
    <td key={c.id} className={clsx('text-center', isMax && 'font-bold text-emerald bg-emerald/10')}>
      {bonus >= 0 ? `+${bonus}` : bonus}
      {skill?.proficient && <span className="text-sky ml-1">P</span>}
      {skill?.expertise && <span className="text-arcane ml-1">E</span>}
    </td>
  )
})}
```

- [ ] **Step 3: Disable Save button while saving**

Update the Save All button to use the `saving` state:

```tsx
<button
  className="px-4 py-1.5 text-sm rounded-lg bg-sky text-white font-semibold hover:bg-sky/80 disabled:opacity-50"
  onClick={handleSave}
  disabled={saving}
>
  {saving ? 'Saving...' : 'Save All'}
</button>
```

- [ ] **Step 4: Verify in browser**

Run: `cd frontend && pnpm dev`

1. Open Skills page
2. Click Edit — cells should show up/down arrows and cycling badge
3. Click arrows to change bonus, click badge to cycle –/P/E
4. Click Cancel — changes discarded
5. Click Edit again, make changes, click Save All — table updates

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SkillsPage.tsx
git commit -m "Add click-only edit controls to skill matrix cells"
```
