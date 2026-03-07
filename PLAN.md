# Execution Plan: Inventory System + Generic/Multi-User

## Phase 1: Inventory Quick Wins
- [x] Inventory search — Frontend-only text filter across item names and notes
- [x] Attunement tracking — `attuned_to` column, item form, character sheet slots (3 max)

## Phase 2: Container Model Overhaul
- [x] Add location field to containers (for caches, safe houses)
- [x] Expand ownership model — container can be owned by a character, a mount entity, or no one
- [x] Dynamic container management — add/remove containers from the UI

## Phase 3: Character + Container Enhancements
- [x] Associate containers with characters — display as "Ayloc's Bag of Holding"
- [x] Max carrying weight on containers — enforce/display weight limits
- [x] Pack animals as first-class entities — model mounts with their own containers

## Phase 4: Bulk Operations + Loot Splitting
- [x] Inventory multi-select — checkboxes for bulk sell, delete, move
- [x] Loot splitting — auto-divide coins/treasure among present characters

## Phase 5: Wealth & Fungibles View
- [x] Dedicated view with per-denomination totals, coin conversion, gems & jewelry

## Phase 6: Label System (replaces categories)
- [x] Flexible multi-label, user-defined, color-coded tags (replaces single `category` column)
- [x] Settings/Admin area for managing labels

## Phase 7: Make the App Generic
- [ ] Remove hardcoded character references from constants.ts, seed files, migration 004
- [ ] Dynamic invite code — changeable via admin setting or API

## Phase 8: Multi-User Robustness
- [ ] Concurrency investigation — optimistic locking, conflict detection
- [ ] Populate changelog diffs — actual before/after diffs in `diff_json`

## Deferred
- Consumables UX review
- HP adjustment UX component
- Critter enhancements (roster, owner change, damage fields)
- Monster condition tracking
- Spell slot tracking
- Skill matrix derivation from character attributes
- Character backstory/lore fields
- Session Journal fixes (save feedback, markdown, XP field)
- Date pickers app-wide
- Dashboard layout fix
- Watch list model fix
- Undo on delete (app-wide)
- AI treasure parser
