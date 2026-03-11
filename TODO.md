# TODO

## ✋ P1 — High Priority
- [x] Show all active users and use character pick list for login #ux
  Display all currently logged-in users (not just yourself — that's already by the logout button). Replace the free-text username field on the login page with a pick list of known characters so players can't enter random names.
- [x] Plan deployment for multi-player usage
  Need cheap/free hosting. Willing to self-host on local network. Single-binary Go + SQLite makes this straightforward (Raspberry Pi, NAS, old laptop). Evaluate: Tailscale Funnel / Cloudflare Tunnel for exposing local server, Fly.io/Railway free tiers for cloud, Docker on home server.
- [ ] Fix character icon assignment #bug #ux
  Icons are being cleared on character update, causing everyone to show the generic User icon. Solution: let players pick from a limited icon pool on their character sheet. Once an icon is picked, it's unavailable to others until freed. Backend already has `pickUnusedIcon()` — extend to a proper selection UI and prevent updates from blanking the field.

## 📌 P2 — Normal
- [ ] Build CSV-based inventory import system
  Two use cases: (1) initial migration from existing spreadsheet, (2) post-session loot entry where GM prose is parsed to CSV externally (AI) then imported. Needs a schema template/prompt doc so external AI produces compatible output.
- [ ] Improve container pick list UX #ux
  Allow adding a new container inline from the item form dropdown. Also improve the container manager for list editing — reordering, better affordances.
- [ ] Add mount management UI #ux
  Mounts are API-only — store has CRUD methods but no UI. Open question: Settings/Admin area, Container Manager modal, or somewhere else?
- [ ] Visual distinction for container owner types #ux
  Nothing differentiates character-owned vs mount-owned containers beyond owner name. Options: icon/badge, "(mount)" label, or color/styling per type.
- [ ] Design magic identification workflow #ux
  No dedicated UX for tracking suspected-magic vs confirmed-magic vs mundane. Want at-a-glance visibility of unidentified items. Consider tri-state or a dedicated "unidentified" flag beyond labels.
- [ ] Fix XP input bug #bug
  XP field incrementer (+/-) makes typing large values awkward (typing "2033" prepends a zero). Allow direct number input.
- [ ] Investigate reorder concurrency issue #tech-debt
  Two users reordering inventory simultaneously causes last-write-wins on `sort_order`. Optimistic locking covers item/container updates but not reorder specifically.
- [ ] Base item catalog with costs, weights, and sell factors
  Create a reference table of standard item costs (gp) and weights (lbs) that serves as the baseline. Editable per-item. Include a "sell factor" per category — e.g. mundane items sell at 50% of base value, gems at 100%. Use this to auto-populate new items and calculate party net worth more accurately.
- [ ] Exclude personally-held items from net worth and sale
  If an item is directly assigned to a character or is in a container owned by a single character, exclude it from party net worth totals and disallow selling it. The player will have already recorded the item on their own sheet — the app is a convenience for visibility so the party can see what everyone has for discussion. Only shared/party loot should count toward net worth and be sellable.

## 🍊 P3 — Low Priority
- [ ] Replace hand-written SQL column lists #tech-debt
  Item queries have 15-20 positional columns — one missed or misordered column silently corrupts data. Affects `items.go`, `containers.go`. Consider constants or a query builder.
- [ ] AI treasure parser (speculative)
  Text field where raw GM treasure prose can be parsed into structured inventory entries. Not committed to adding AI to the app yet — revisit when the rest of the system is more mature.
- [ ] Add undo on delete (app-wide) #ux
  Brief undo toast after deletes so the action can be reversed.
- [ ] Replace Session Journal delete `alert()` with toast/modal #ux
- [ ] HP adjustment UX component #ux
  Shared for critters and characters: type a number and apply as heal or damage. Reusable component across both.
- [ ] Critter enhancements
  - [ ] Persistent critter roster for quick-pick reuse
  - [ ] Allow changing critter owner
  - [ ] Add damage adjustment field(s)
- [ ] Derive skill matrix from character attributes
  Compute from ability scores, proficiency bonus, per-skill flags instead of manual entry. Auto-updates on level-up.
- [ ] Add character backstory/lore fields
  Freeform history section on character sheets. Consider long-term goals (GM-visible for narrative hooks).
- [ ] Replace date text inputs with date pickers app-wide #ux
- [ ] Session Journal fixes #ux
  - [ ] "Save" button gives no feedback — add toast or state change
  - [ ] Session list doesn't show journal body after save
  - [ ] Switch from HTML to Markdown for content
  - [ ] Date picker defaulting to today
  - [ ] Auto-create XP record on save for that session's date
- [ ] Consumables UX review #ux
  Current model is unclear — rethink tracking, usage, and distinction from regular inventory.
- [ ] Fix dashboard consumables layout #ux
- [ ] Fix watch list model
  A "slot" should be a shared time period (3 watches per night, 2-3 characters each). Current data model may be wrong. Future: race-aware rest requirements.
- [ ] Spell slot tracking
  Per-character per-day slot grid. Needs new DB table(s) and UI on character sheets or dedicated page.
- [ ] Monster condition tracking
  Track status conditions (blinded, charmed, poisoned, etc.) on critters during combat. Extend critter model with conditions list — players add/remove, DM gets at-a-glance view.

## Done
- [x] ~~Dynamic invite code~~
- [x] ~~Remove hardcoded character references~~
- [x] ~~Label system replacing categories~~
- [x] ~~Container model overhaul~~
- [x] ~~Character-container association~~
- [x] ~~Inventory multi-select~~
- [x] ~~Wealth/fungibles view~~
- [x] ~~Loot splitting~~
- [x] ~~Attunement tracking~~
- [x] ~~Inventory search~~
