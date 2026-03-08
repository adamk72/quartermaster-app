# TODO

## Now
- [ ] **✋ P1** · Plan deployment for multi-player usage
  Need cheap/free hosting. Willing to self-host on local network. Single-binary Go + SQLite makes this straightforward (Raspberry Pi, NAS, old laptop). Evaluate: Tailscale Funnel / Cloudflare Tunnel for exposing local server, Fly.io/Railway free tiers for cloud, Docker on home server.
- [ ] **✋ P1** · Create product requirements document (`docs/prd.md`)

## Next
- [ ] **📌 P2** · Build CSV-based inventory import system
  Two use cases: (1) initial migration from existing spreadsheet, (2) post-session loot entry where GM prose is parsed to CSV externally (AI) then imported. Needs a schema template/prompt doc so external AI produces compatible output.
- [ ] **📌 P2** · Improve container pick list UX #ux
  Allow adding a new container inline from the item form dropdown. Also improve the container manager for list editing — reordering, better affordances.
- [ ] **📌 P2** · Add mount management UI #ux
  Mounts are API-only — store has CRUD methods but no UI. Open question: Settings/Admin area, Container Manager modal, or somewhere else?
- [ ] **📌 P2** · Visual distinction for container owner types #ux
  Nothing differentiates character-owned vs mount-owned containers beyond owner name. Options: icon/badge, "(mount)" label, or color/styling per type.
- [ ] **📌 P2** · Design magic identification workflow #ux
  No dedicated UX for tracking suspected-magic vs confirmed-magic vs mundane. Want at-a-glance visibility of unidentified items. Consider tri-state or a dedicated "unidentified" flag beyond labels.
- [ ] **📌 P2** · Fix XP input bug #bug
  XP field incrementer (+/-) makes typing large values awkward (typing "2033" prepends a zero). Allow direct number input.
- [ ] **📌 P2** · Investigate reorder concurrency issue #tech-debt
  Two users reordering inventory simultaneously causes last-write-wins on `sort_order`. Optimistic locking covers item/container updates but not reorder specifically.

## Later
- [ ] **🍊 P3** · Replace hand-written SQL column lists #tech-debt
  Item queries have 15-20 positional columns — one missed or misordered column silently corrupts data. Affects `items.go`, `containers.go`. Consider constants or a query builder.
- [ ] **🍊 P3** · AI treasure parser (speculative)
  Text field where raw GM treasure prose can be parsed into structured inventory entries. Not committed to adding AI to the app yet — revisit when the rest of the system is more mature.
- [ ] **🍊 P3** · Add undo on delete (app-wide) #ux
  Brief undo toast after deletes so the action can be reversed.
- [ ] **🍊 P3** · Replace Session Journal delete `alert()` with toast/modal #ux
- [ ] **🍊 P3** · HP adjustment UX component #ux
  Shared for critters and characters: type a number and apply as heal or damage. Reusable component across both.
- [ ] **🍊 P3** · Critter enhancements
  - [ ] Persistent critter roster for quick-pick reuse
  - [ ] Allow changing critter owner
  - [ ] Add damage adjustment field(s)
- [ ] **🍊 P3** · Derive skill matrix from character attributes
  Compute from ability scores, proficiency bonus, per-skill flags instead of manual entry. Auto-updates on level-up.
- [ ] **🍊 P3** · Add character backstory/lore fields
  Freeform history section on character sheets. Consider long-term goals (GM-visible for narrative hooks).
- [ ] **🍊 P3** · Replace date text inputs with date pickers app-wide #ux
- [ ] **🍊 P3** · Session Journal fixes #ux
  - [ ] "Save" button gives no feedback — add toast or state change
  - [ ] Session list doesn't show journal body after save
  - [ ] Switch from HTML to Markdown for content
  - [ ] Date picker defaulting to today
  - [ ] Auto-create XP record on save for that session's date
- [ ] **🍊 P3** · Consumables UX review #ux
  Current model is unclear — rethink tracking, usage, and distinction from regular inventory.
- [ ] **🍊 P3** · Fix dashboard consumables layout #ux
- [ ] **🍊 P3** · Fix watch list model
  A "slot" should be a shared time period (3 watches per night, 2-3 characters each). Current data model may be wrong. Future: race-aware rest requirements.
- [ ] **🍊 P3** · Spell slot tracking
  Per-character per-day slot grid. Needs new DB table(s) and UI on character sheets or dedicated page.
- [ ] **🍊 P3** · Monster condition tracking
  Track status conditions (blinded, charmed, poisoned, etc.) on critters during combat. Extend critter model with conditions list — players add/remove, DM gets at-a-glance view.

## Done
- [x] ~~Dynamic invite code~~ — settings table, editable from Settings page
- [x] ~~Remove hardcoded character references~~ — `PARTY_MEMBERS` removed from constants
- [x] ~~Label system replacing categories~~ — multi-label, user-defined, color-coded
- [x] ~~Container model overhaul~~ — location field, dynamic add/remove, ownership (character/mount/none)
- [x] ~~Character-container association~~ — owned containers, weight limits, pack animals
- [x] ~~Inventory multi-select~~ — bulk sell, delete, move
- [x] ~~Wealth/fungibles view~~ — denomination totals, conversion, gems & jewelry
- [x] ~~Loot splitting~~ — auto-divide coins among present characters
- [x] ~~Attunement tracking~~ — 3-slot per character, container ownership rule
- [x] ~~Inventory search~~ — text filter across item names and notes
