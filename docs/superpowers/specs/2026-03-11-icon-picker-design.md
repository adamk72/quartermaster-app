# Icon Picker Design

## Problem

Character icons are cleared on update because the edit form doesn't include the icon field, sending an empty string to the backend. Players have no UI to choose their icon — assignment is automatic via `pickUnusedIcon()`.

## Solution

Add a clickable icon picker popover on character cards, and fix the backend to preserve icons on update.

## Bug Fix — Backend

In `handleUpdateCharacter`: if `c.Icon` is empty, query the existing icon with `SELECT icon FROM characters WHERE id = ?` and set `c.Icon` to that value before writing. This is icon-specific — other fields that legitimately get cleared (like notes) are unaffected.

## Icon Picker — Frontend

### Interaction
- Click the icon on any character card → compact popover appears below the icon
- 4-column grid showing all 14 Lucide icons from `ICON_MAP`
- Current icon: highlighted (gold background)
- Taken by another character: dimmed, unclickable
- Available: normal style, clickable
- Click an available icon → calls `updateCharacter` with the new icon → popover closes
- Click outside or Escape → closes without changes

### No New API Endpoint

The characters list is already in the Zustand store. Derive used icons on the frontend:
```ts
const usedIcons = Object.fromEntries(characters.map(c => [c.icon, c.id]))
```

### New Component

`IconPicker` — a popover containing the icon grid. Props:
- `characterId`: the character whose icon is being changed
- `currentIcon`: the currently selected icon name
- `usedIcons`: map of icon name → character ID (to dim taken icons)
- `onSelect(iconName: string)`: callback when an icon is picked
- `onClose()`: callback to dismiss

Requires exporting `ICON_MAP` from `constants/characterIcons.ts` (currently only `getCharacterIcon` is exported).

### Integration Point

On the character card in `CharactersPage.tsx`, the existing icon render becomes clickable. Clicking it opens the `IconPicker` popover positioned relative to the icon.

## Edge Cases

- **All 14 icons taken**: With 6 party members and 14 icons this won't happen in practice. If it did, all icons would be dimmed except the character's own current icon. The backend `pickUnusedIcon()` already falls back to `iconPool[0]`.
- **Concurrent selection**: Last-write-wins. Two players could pick the same icon simultaneously. Acceptable risk with 6 players — the second save would succeed and both would have the same icon until one changes. No uniqueness constraint needed.
- **Changelog**: Icon changes go through the existing `updateCharacter` endpoint, so `LogChange` with diff captures them automatically.

## What Doesn't Change

- `pickUnusedIcon()` still auto-assigns on create when no icon is provided
- The character edit form has no icon field — the card popover is the only picker
- Icons are exclusive: once picked, unavailable to others (enforced in UI, not DB)

## Icon Pool (14 icons)

Sword, Shield, Crown, Flame, Snowflake, Zap, Axe, Moon, Eye, Gem, Mountain, Compass, Feather, Star
