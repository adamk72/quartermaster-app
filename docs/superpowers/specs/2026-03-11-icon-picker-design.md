# Icon Picker Design

## Problem

Character icons are cleared on update because the edit form doesn't include the icon field, sending an empty string to the backend. Players have no UI to choose their icon — assignment is automatic via `pickUnusedIcon()`.

## Solution

Add a clickable icon picker popover on character cards, and fix the backend to preserve icons on update.

## Bug Fix — Backend

In `handleUpdateCharacter`: if `c.Icon` is empty, load the existing icon from the DB before writing the update. This prevents the edit form (which doesn't send icon) from blanking it.

## Icon Picker — Frontend

### Interaction
- Click the icon on any character card → compact popover appears
- 4-column grid showing all 14 Lucide icons from `ICON_MAP`
- Current icon: highlighted (gold background)
- Taken by another character: dimmed, unclickable
- Available: normal style, clickable
- Click an available icon → calls `updateCharacter` with the new icon → popover closes
- Click outside or Escape → closes without changes

### New API Endpoint

**GET `/api/v1/characters/icons`** — returns which icons are in use:
```json
{ "used": { "Crown": "character-id-1", "Snowflake": "character-id-2" } }
```

The frontend uses this to determine which icons to dim in the picker.

### New Component

`IconPicker` — a popover containing the icon grid. Props:
- `characterId`: the character whose icon is being changed
- `currentIcon`: the currently selected icon name
- `usedIcons`: map of icon name → character ID (to dim taken icons)
- `onSelect(iconName: string)`: callback when an icon is picked
- `onClose()`: callback to dismiss

Uses existing `ICON_MAP` from `constants/characterIcons.ts`.

### Integration Point

On the character card in `CharactersPage.tsx`, the existing icon render becomes clickable. Clicking it opens the `IconPicker` popover positioned relative to the icon.

## What Doesn't Change

- `pickUnusedIcon()` still auto-assigns on create when no icon is provided
- The character edit form has no icon field — the card popover is the only picker
- Icons are exclusive: once picked, unavailable to others

## Icon Pool (14 icons)

Sword, Shield, Crown, Flame, Snowflake, Zap, Axe, Moon, Eye, Gem, Mountain, Compass, Feather, Star
