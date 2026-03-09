# Quartermaster App — Product Requirements Document

## What This Is

A multi-user webapp that replaces Google Sheets + Docs for tracking a weekly D&D campaign. The party shares a single source of truth for inventory, wealth, quests, session notes, and character data. Any player can edit anything. A full changelog provides accountability.

The app is purpose-built for one campaign group but designed generically — no hardcoded character names, no campaign-specific assumptions baked into the code. A new group could spin it up, enter an invite code, and start from scratch.

## Who Uses It

- **Players** (4-6 per campaign) — manage their character's inventory, log session notes, track quests, update skills/XP
- **GM** (also a player in this group's case) — same access as players, plus tends to be the one entering loot after sessions

There are no roles or permissions. Everyone can edit everything. The changelog is the accountability mechanism, not access control.

## Auth Model

Deliberately simple. No passwords, no email, no OAuth.

1. The GM sets an **invite code** (shared out of band — text, Discord, etc.)
2. A player enters their **username** + the invite code
3. The server issues a **session token** (stored in localStorage)
4. The invite code can be changed from Settings at any time

This is appropriate for a trusted group of friends. The invite code prevents random access but doesn't aim for real security.

## Core Domains

### Inventory

The heart of the app. Items live inside containers, containers are owned by characters or mounts (or no one, for stashes/caches/vendors).

**Items** have: name, quantity, credit/debit GP values, game date, weight, value, sold status, identified status, attunement, labels, notes, sort order.

**Containers** have: name, type (character/bag/mount/cache/vendor), owner (character or mount), weight limit, location, notes.

**Key interactions:**
- Create/edit/delete items and containers
- Drag-reorder items within containers
- Filter by label, search by name/notes
- Bulk operations: sell, delete, move (multi-select)
- Mark items as sold/unsold, identified
- Attune items to characters (3-slot max per D&D rules)

**Labels** replace a fixed category system. User-defined, color-coded, multi-label per item. Managed in Settings. Used for filtering inventory and identifying gems/jewelry on the Wealth page.

### Wealth

Coin tracking is ledger-based, not balance-based. Every transaction (loot found, items sold, expenses paid) is a ledger entry with per-denomination amounts (pp, gp, ep, sp, cp).

**Key interactions:**
- Add/remove coin ledger entries with game dates
- View current balance by denomination
- Convert between denominations (e.g., 10sp → 1gp)
- Loot split: divide coins among selected characters with configurable conversion and reserve options; remainder goes to first character
- Gems and jewelry surface here (filtered from inventory by the "treasure" label)

### Characters

The party roster. Each character has: name, player name, class, level, race, AC, HP max, notes.

Characters are the backbone — they own containers, attune items, attend XP sessions, get assigned watch slots, and own critters.

### Session Journal

Campaign session log. Each entry has a game date, title, and rich-text body (TipTap/ProseMirror editor). Supports image uploads with captions.

Used for session recaps, plot notes, and loot records. The GM or a designated note-taker writes these during or after each session.

### XP Tracking

Ledger of XP awards tied to sessions. Each entry specifies an XP amount and which characters were **present** (attendance tracking). Characters who miss a session don't get that XP.

The system auto-calculates each character's level from their total XP using D&D 5e thresholds (300 → level 2, 900 → level 3, ... up to 355,000 → level 20).

### Quests

Simple quest log with four statuses: active, completed, failed, on hold. Each quest has a title, description, notes, and relevant game dates (added, completed).

### Skills

Character skill matrix. Each of the 18 D&D skills has a bonus modifier, proficiency flag, and expertise flag per character. A reference table provides the canonical skill list with associated abilities.

### Watch Schedules

Night watch rotation builder. Schedules contain named watches, each with assigned characters and a sort order. One schedule can be active at a time.

### Critters

Temporary creatures: summoned animals, companions, cohorts. Each has an owner (character), HP current/max, AC, notes, and an active flag. "Dismiss all" clears the board between encounters.

### Consumables

Tracks expendable supplies (rations, water, torches, etc.) with a type definition (unit, per-person-per-day rate) and a ledger of additions/subtractions. A "consume day" action deducts a day's worth for a given head count. Dashboard shows days-remaining alerts.

### Changelog

Every create, update, and delete across the app is logged with: who, what table, which record, what action, and a field-level diff (before/after values). Paginated, read-only. This is the "who changed what" audit trail that replaces the implicit history of Google Sheets.

### Settings

- **Labels**: CRUD for the label system (name, color, sort order)
- **Invite code**: View and change the current invite code

## Technical Architecture

### Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Zustand 5, React Router, Lucide React, TipTap (rich editor)
- **Backend**: Go 1.23, stdlib `net/http` (1.22+ route patterns), `database/sql`
- **Database**: SQLite via `github.com/mattn/go-sqlite3`
- **Build**: Single Go binary embeds the React build. `pnpm` for frontend packages.

### Data Flow
- Frontend talks to backend via REST (`/api/v1/*`), Bearer token auth
- Backend talks to SQLite directly (no ORM)
- State management via Zustand stores (one per domain)
- Optimistic locking on items and containers (version column, 409 on conflict)

### Deployment Model (Current)
- Development: `make dev` runs Go backend on `:8080` + Vite dev server on `:5173` (proxies API)
- Production: `make build` produces a single binary serving both API and SPA
- Data: single `campaign.db` SQLite file + `uploads/` directory for images
- Backup: `make export` dumps all tables to JSON; `make restore` reimports

### What Makes This Work for D&D
- **Shared editing**: No ownership model. Anyone edits anything. The changelog is the safety net.
- **Game-date awareness**: Items, coins, XP, quests, and sessions all track in-game dates, not just real-world timestamps.
- **Ledger-based wealth**: Coin history is never lost. You can trace every gold piece to when it was found and where it went.
- **Container hierarchy**: Models how D&D inventory actually works — items in bags, bags on characters or mounts, stashes at locations.
- **Attunement**: Enforces D&D's 3-item attunement limit per character.

---

## Vision — Where It's Going

### Deployment (P1)

The app currently runs on localhost. For multi-player use, it needs to be accessible to 4-6 players during weekly sessions.

**Options under evaluation:**
- **Self-hosted on local network** — Raspberry Pi, NAS, or old laptop. Expose via Tailscale Funnel or Cloudflare Tunnel (no port forwarding, no static IP needed). Most aligned with the single-binary + SQLite architecture.
- **Cloud free tier** — Fly.io, Railway, or similar. Simpler for players (just a URL) but adds operational complexity and potential costs.
- **Docker on home server** — Middle ground. Containerized but still self-hosted.

The single-binary Go + SQLite design was chosen partly for this — deployment should be "copy binary, run it."

### Data Import (P2)

Two import workflows needed:

1. **Initial migration** — Import an existing spreadsheet inventory via CSV when bootstrapping a new campaign or switching from Sheets. Characters and mounts would be entered manually; items are the high-volume data.

2. **Post-session loot entry** — After a session, the GM provides a prose block of treasure found. The player pastes it into an external AI tool which parses it into CSV, then imports via the app. This needs a documented schema template so the AI produces compatible output.

### Magic Identification Workflow (P2)

Items can enter inventory with unknown magical properties. The current "identified" flag is binary (yes/no), but the real workflow is a tri-state:
- **Mundane** — known to be non-magical
- **Suspected/unidentified** — might be magical, hasn't been checked
- **Identified magic** — confirmed magical, properties known

Players need to see at a glance what hasn't been checked yet, separate from items known to be non-magical.

### Container & Mount UX (P2)

Several UX gaps in the container system:
- **Inline container creation** — Add a new container directly from the item form's dropdown instead of switching to the container manager first.
- **Mount management UI** — Mounts exist in the API but have no frontend UI. Need CRUD somewhere (Settings? Container Manager? Dedicated section?).
- **Visual owner distinction** — Character-owned vs mount-owned containers look identical. Need icons, labels, or color coding to differentiate.
- **Container manager polish** — Better affordances for reordering, editing, and common operations.

### Combat Support (P3)

Several features would support in-session combat tracking:

- **HP adjustment component** — Shared for characters and critters. Type a number, apply as heal or damage. Reusable across character sheets and critter cards.
- **Monster condition tracking** — Track D&D status conditions (blinded, charmed, poisoned, etc.) on critters. Players add/remove, GM sees at a glance.
- **Critter roster** — Save critter templates for reuse. Currently each critter is created from scratch every time.
- **Spell slot tracking** — Per-character per-day slot grid. New DB table(s), UI on character sheets or a dedicated page.

### Character Depth (P3)

- **Derived skill matrix** — Compute skill bonuses from ability scores + proficiency bonus + per-skill flags instead of manual entry. Auto-updates on level-up.
- **Backstory/lore fields** — Freeform history section on character sheets. Long-term character goals visible to GM for narrative hooks.

### UX Polish (P3)

Accumulated paper cuts:
- XP input bug (incrementer prepends zero when typing)
- Date pickers instead of text inputs app-wide
- Session Journal: save feedback, body display in list, Markdown instead of HTML, date picker defaults, auto-XP on save
- Undo on delete (brief toast across the app)
- Replace native `alert()` with app-consistent toast/modal
- Consumables UX rethink (unclear model)
- Dashboard consumables layout fix
- Watch schedule model fix (slots should be shared time periods, not individual assignments)

### Technical Debt (P3)

- **SQL column lists** — Item queries have 15-20 positional columns. One typo silently corrupts data. Needs constants or a query builder.
- **Reorder concurrency** — Two users reordering simultaneously causes last-write-wins on `sort_order`. Optimistic locking covers item/container field edits but not sort order specifically.

### Speculative

- **AI treasure parser** — Paste raw GM treasure prose directly into the app and parse it into structured items. Not committed to adding AI to the app — revisit when the system is more mature. The CSV import workflow with an external AI tool may be sufficient.

---

## Open Questions

These are areas where the design is incomplete or the right approach isn't clear yet:

1. **Where should mount management live?** Settings page, Container Manager modal, or its own section? Mounts are closely related to containers but managed differently than labels.

2. **How should the magic identification tri-state work?** A new DB column (enum), a special label, or a combination? The current `identified` boolean doesn't capture "suspected but unchecked."

3. **What's the right consumables model?** The current type + ledger approach works mechanically but the UX is confusing. Should consumables be regular inventory items with a "consumable" flag? A separate system? Something else?

4. **Watch schedule data model** — A "slot" should represent a shared time period (3 watches per night, 2-3 characters each), not an individual character assignment. The current model may need restructuring.

5. **Spell slot tracking scope** — Full spellcasting support (known spells, prepared spells, slots) is a massive feature. Is slot tracking alone useful, or does it need the full spell list to be worthwhile?

6. **Session Journal format** — Currently uses TipTap/HTML. Switching to Markdown changes the editor, storage, and rendering. Worth it for simplicity, or is rich editing valuable enough to keep?

7. **Backup and data durability** — JSON export/restore works but is manual. For multi-player deployment, what's the backup strategy? Automated SQLite backups? Litestream replication?

8. **Should the app ever need roles/permissions?** The current "everyone can edit everything" model works for a trusted group. If the app were used by a larger or less trusted group, would GM-only actions (e.g., XP awards, quest status) be needed?
