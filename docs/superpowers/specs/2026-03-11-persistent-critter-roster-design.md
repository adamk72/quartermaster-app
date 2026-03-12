# Persistent Critter Roster Design

## Overview

Replace the current flat critter list with a **blueprint/instance model**. A shared party roster stores creature templates (blueprints). Players summon instances from blueprints — multiple instances of the same creature type can be active simultaneously, each with independent HP and ownership.

## Data Model

### New table: `critter_templates`

Shared party roster of creature blueprints.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | e.g., "Wolf", "Skeleton" |
| hp_max | INTEGER NOT NULL DEFAULT 0 | |
| ac | INTEGER NOT NULL DEFAULT 10 | |
| speed | INTEGER NOT NULL DEFAULT 30 | feet per round |
| initiative | INTEGER NOT NULL DEFAULT 0 | initiative modifier |
| save_str | INTEGER NOT NULL DEFAULT 0 | STR save modifier |
| save_dex | INTEGER NOT NULL DEFAULT 0 | DEX save modifier |
| save_con | INTEGER NOT NULL DEFAULT 0 | CON save modifier |
| save_int | INTEGER NOT NULL DEFAULT 0 | INT save modifier |
| save_wis | INTEGER NOT NULL DEFAULT 0 | WIS save modifier |
| save_cha | INTEGER NOT NULL DEFAULT 0 | CHA save modifier |
| notes | TEXT NOT NULL DEFAULT '' | abilities, resistances, etc. |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

No owner column — blueprints are shared across the party.

### Modified table: `critters` (instances)

Active summoned creatures. Each instance is an independent copy of a blueprint's stats at summon time.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | e.g., "Wolf" |
| template_id | INTEGER REFERENCES critter_templates(id) | source blueprint |
| character_id | TEXT NOT NULL REFERENCES characters(id) | owner/summoner |
| instance_number | INTEGER NOT NULL DEFAULT 1 | auto-incremented per template name |
| hp_current | INTEGER NOT NULL DEFAULT 0 | |
| hp_max | INTEGER NOT NULL DEFAULT 0 | |
| ac | INTEGER NOT NULL DEFAULT 10 | |
| speed | INTEGER NOT NULL DEFAULT 30 | |
| initiative | INTEGER NOT NULL DEFAULT 0 | |
| save_str | INTEGER NOT NULL DEFAULT 0 | |
| save_dex | INTEGER NOT NULL DEFAULT 0 | |
| save_con | INTEGER NOT NULL DEFAULT 0 | |
| save_int | INTEGER NOT NULL DEFAULT 0 | |
| save_wis | INTEGER NOT NULL DEFAULT 0 | |
| save_cha | INTEGER NOT NULL DEFAULT 0 | |
| notes | TEXT NOT NULL DEFAULT '' | |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |

**Removed:** `active` column. Dismissing now hard-deletes the instance row. The blueprint persists in `critter_templates`.

### Key behaviors

- **Summon** = copy all stats from template into a new critter row, set `hp_current = hp_max`, assign owner and auto-increment `instance_number`.
- **Instance numbering**: auto-increment per template name across all active instances. Never reuse gaps. E.g., if Wolf 1, Wolf 2 exist and Wolf 2 is dismissed, next summon is Wolf 3.
- **Blueprint edits** do NOT affect existing active instances.
- **Deleting a blueprint** is allowed even if instances exist (they have copied stats).

## API Endpoints

### New — Blueprint CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/critter-templates` | List all blueprints |
| POST | `/api/v1/critter-templates` | Create blueprint |
| PUT | `/api/v1/critter-templates/{id}` | Update blueprint |
| DELETE | `/api/v1/critter-templates/{id}` | Delete blueprint |

### Modified — Instance endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/critters` | List active instances |
| POST | `/api/v1/critters` | Summon: `{ template_id, character_id }` — copies stats, assigns instance_number |
| PUT | `/api/v1/critters/{id}` | Update instance (HP, owner, etc.) |
| DELETE | `/api/v1/critters/{id}` | Dismiss instance (hard delete) |
| POST | `/api/v1/critters/dismiss-all` | Dismiss all (bulk hard delete) |

All mutations logged to changelog.

## UX Design

### Page Layout: Sidebar + Main Grid

**Left sidebar — Blueprint Roster:**
- Scrollable list of blueprints, each showing name with summon and edit icons
- "+ New" button at top opens a blueprint dialog
- Summon icon shows a small popover to pick owner character, then instantly creates an instance
- Edit icon opens the same dialog pre-filled with blueprint stats

**Main area — Active Instance Grid:**
- 2-3 column responsive grid of instance cards
- "Dismiss All" button in the header when instances exist
- Empty state: "No critters summoned" message

### Blueprint Dialog (create/edit)

Modal with fields:
- Name (text, required)
- HP Max (number)
- AC (number, default 10)
- Speed (number, default 30)
- Initiative (number, default 0)
- 6 save bonuses in a compact row: STR, DEX, CON, INT, WIS, CHA (numbers, default 0)
- Notes (textarea)

### Instance Card

Compact combat-ready card showing:
- **Header**: Name with instance number (e.g., "Wolf 2"), owner name (clickable to reassign)
- **HP section**: +/- 1 buttons flanking current/max display + colored HP bar (green >50%, amber >25%, red <=25%). Plus a number input with damage/heal buttons for larger adjustments.
- **Stat badges**: AC, Speed, Initiative in a compact row
- **Save bonuses**: Compact row of 6 values (S/D/C/I/W/Ch)
- **Notes**: Collapsible section
- **Dismiss button**: X icon to remove this instance

### Summon Flow

1. Player clicks summon icon on a blueprint in the sidebar
2. Small popover appears with character picker (dropdown of party members)
3. Player selects owner, instance is created immediately
4. New card appears in the grid with full HP and copied stats

### Owner Reassignment

Click the owner name on an instance card to get the same character picker popover. Select a new owner to reassign.

## Migration Notes

- Existing critter rows need to be migrated: create a blueprint for each unique critter name, then link existing rows via `template_id`.
- Add new columns (speed, initiative, save_*, instance_number, template_id) to critters table.
- Drop `active` column from critters. Hard-delete any rows where `active = 0` during migration.

## TODOs Addressed

- **Persistent critter roster for quick-pick reuse** — core feature
- **Allow changing critter owner** — click owner name to reassign
- **Add attribute saves to critters** — 6 save bonuses on blueprint + instance
- **HP adjustment UX component** — +/- 1 buttons plus number input with damage/heal
