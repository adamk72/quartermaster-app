# TODO

## High Priority
- [ ] Create `docs/prd.md` — product requirements document describing the app in full detail
- [ ] Improve container pick list UX: allow adding a new container inline from the item form's container dropdown (rather than requiring the user to open the container manager first). Also improve the container manager for general list editing — reordering, better affordances for common operations.
- [ ] Mount management UI: add the ability to create, edit, and delete mounts (pack animals) from the frontend. Currently mounts are API-only — the store has CRUD methods but no UI calls them. Open question: should this live in a Settings/Admin area, inline in the Container Manager modal (since mounts are container owners), or somewhere else?
- [ ] Visual distinction for container owner types: currently nothing differentiates character-owned vs. mount-owned containers in the UI beyond the owner's name. Options: icon/badge (horse vs. person), a "(mount)"/"(pack animal)" label, or different color/styling for mount-owned container groups.

## Tech Debt
- [ ] Replace hand-written SQL column lists with constants or a query builder. Item queries have 15-20 positional columns — one missed or misordered column silently corrupts data. Affects `items.go`, `containers.go`, and any future table with many columns.

## Backlog

### Low Priority / Future
- [ ] Allow changing the invite code dynamically (currently hardcoded via `INVITE_CODE` env var at server startup, defaulting to "dragons"). Could be an admin setting or API endpoint.
- [ ] AI treasure parser (speculative): a text field where raw GM treasure text can be pasted and parsed into structured inventory entries. The GM's loot descriptions are usually a prose blob (e.g. "6 pairs of jade earplugs worth 15 gp each, an alabaster statuette worth 50 gp...") — AI could extract items, quantities, and values automatically. Not committed to adding AI to the app yet; revisit when the rest of the system is more mature.
- [ ] Undo on delete: when something is deleted, show a brief undo toast/popup for a few seconds so the action can be reversed. Similar to the existing undo system — extend it app-wide if not already.
- [ ] Session Journal delete uses a native browser `alert()` instead of the app's toast system — replace with a toast confirmation or modal consistent with the rest of the app.

### General
- [ ] Remove hardcoded character/item references to make the app generic: party member names are baked into seed files and `constants.ts`, and likely have hidden dependencies elsewhere. The app should work for any campaign with any characters — all campaign-specific data should come from the database, not code.
- [x] Replace inventory "category" with a flexible label system (multi-label, user-defined, color-coded) similar to GitLab/Linear. Likely requires a Settings or Admin area for managing labels and other future admin concerns.
- [ ] Investigate concurrency issue: what happens when two users reorder inventory simultaneously (last-write-wins conflict on `sort_order`).
- [ ] HP adjustment UX (shared for critters and characters): alongside +/- buttons, allow the user to type a number and apply it as heal or damage (e.g. "take 12 damage" / "heal 8"). Should be a consistent component reused across both.
- [ ] Critter enhancements:
  - [ ] Persistent critter roster: when a critter is created, save it to a reusable roster so future critters can be quick-picked instead of re-entered from scratch
  - [ ] Allow changing the owner of an existing critter
  - [ ] Add numeric field(s) to adjust critter damage up or down
- [x] Container model overhaul: the current container concept may need to become a first-class object type to handle the full range of use cases. Containers include not just carried bags but also location-based caches and safe houses. Needs:
  - [x] Optional location field (for caches, safe houses, etc.)
  - [x] Ability to add/remove containers dynamically as the campaign progresses
  - [x] Ownership: a container can be owned by a character, a pack animal, or no one (a stash at a location)
  - [x] This work likely subsumes parts of the character enhancements below (character-owned containers, pack animals)
- [ ] Derive skill matrix from character sheet data: instead of manually entering skill values, compute them from character attributes (ability scores, proficiency bonus, proficiency/expertise flags per skill). As characters level up and stats change, the skill matrix updates automatically. Requires adding the necessary inputs to character sheets (ability scores, proficiency bonus, per-skill proficiency/expertise toggles).
- [ ] Character backstory / lore fields: add a section on character sheets for freeform history/backstory (some are short, some are long). Also consider additional fields surfaced in Ruya's existing description, including long-term character goals — goals could be GM-visible to help drive the campaign narrative.
- [ ] Character enhancements:
  - [x] Associate containers with characters: each character can own one or more containers (e.g. bags of holding). Owned containers should display with a character-scoped name in the inventory list (e.g. "Ayloc's Bag of Holding") so players know where items are stored.
  - [x] Add max carrying weight to containers.
  - [x] Pack animals: model pack animals (e.g. Bill the Mule) similarly to characters — they can own containers and carry items. Should support multiple animals if the party acquires more.
- [x] Inventory multi-select actions: make items selectable (checkboxes or similar) to enable bulk operations:
  - [x] Bulk sell / undo
  - [x] Bulk delete
  - [x] Bulk move: if all selected items share the same container, allow moving them to a different container
- [x] Wealth / fungibles section: separate view (or section) for coinage and near-fungible valuables:
  - [x] Coinage: show per-denomination totals (pp, gp, ep, sp, cp) with a running total converted to gp
  - [x] Coin conversion: allow converting between denominations (e.g. 10sp → 1gp)
  - [x] Gems & jewelry: non-magical, relatively fungible valuables need a home — either here or in inventory with a special category. TBD where they live, but they should contribute to net worth total.
- [ ] XP input bug: the XP field is an incrementer (+/-) which makes typing large values awkward (e.g. typing "2033" prepends a zero). Allow direct number input alongside or instead of the incrementer.
- [ ] Replace all date text inputs with calendar/date pickers app-wide (the session journal game day picker is one instance of this).
- [ ] Session Journal fixes and improvements:
  - [ ] "Save" button gives no visual feedback — add a success indicator (toast, button state change, etc.)
  - [ ] After saving and returning to the session list, only the title and date show — the journal body is not displayed; fix the list/detail view to show content
  - [ ] Switch from HTML to Markdown for journal entry content (storage + editor)
  - [ ] Replace the game day text input with a calendar/date picker that defaults to today
  - [ ] Add an XP field to the journal entry form: on save, automatically create an XP record for all characters for that session's date. Useful since XP is typically handed out while the journal is being written.
- [ ] Consumables UX review: the current consumables model is unclear and needs rethinking — how they're tracked, used, and distinguished from regular inventory. Revisit the design before implementing further.
- [ ] Dashboard: align/fix layout of the consumables summary boxes.
- [ ] Fix watch list model: a "slot" should represent a shared time period (e.g. a night has 3 watches, each watch has 2–3 characters on it together). Currently the data model may not reflect this correctly. Future enhancement: make the system race-aware for rest requirements (e.g. elves only need 4 hours so can cover two watch slots).
- [x] Loot splitting: auto-divide coins/treasure evenly among present characters after a haul. Happens nearly every session and is tedious to do manually. Could tie into the coin ledger and attendance tracking that already exist.
- [x] Attunement tracking: track which magic items are attuned per character (D&D 3-item limit). Magic items are already flagged with category; add an `attuned_to` character reference on items and surface attunement slots on character sheets.
- [x] Inventory search: add text search across item names and notes. Currently only category filtering exists; pain grows every session as items accumulate.
- [ ] Spell slot tracking: track remaining spell slots per character per day. At minimum, a per-level slot grid that can be ticked off during play. Needs new DB table(s) and a UI section on character sheets or a dedicated page.
- [ ] Monster condition tracking: allow players to help the DM track status conditions (blinded, charmed, poisoned, etc.) on critters during combat. D&D Beyond only lets players track conditions on their own characters, and the table's physical color-coded system breaks down when multiple conditions overlap (limited palette, one color at a time). The app's existing critter model could be extended with a conditions list per critter — players can add/remove conditions, and the DM gets a clear at-a-glance view of all active conditions on each monster.
