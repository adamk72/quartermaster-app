-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    player_name TEXT NOT NULL DEFAULT '',
    class TEXT NOT NULL DEFAULT '',
    level INTEGER NOT NULL DEFAULT 1,
    race TEXT NOT NULL DEFAULT '',
    ac INTEGER NOT NULL DEFAULT 10,
    hp_max INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Containers (character inventory, bag of holding, mounts, caches, vendors)
CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('character','bag','mount','cache','vendor')),
    character_id TEXT REFERENCES characters(id),
    weight_limit REAL,
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Items (treasure + inventory)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    credit_gp REAL,
    debit_gp REAL,
    game_date TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Item' CHECK(category IN ('Magic','Item','Treasure','Expense','Coin')),
    container_id TEXT REFERENCES containers(id),
    sold INTEGER NOT NULL DEFAULT 0,
    unit_weight_lbs REAL,
    unit_value_gp REAL,
    weight_override REAL,
    added_to_dndbeyond INTEGER NOT NULL DEFAULT 0,
    singular TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coin ledger
CREATE TABLE IF NOT EXISTS coin_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_date TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cp INTEGER NOT NULL DEFAULT 0,
    sp INTEGER NOT NULL DEFAULT 0,
    ep INTEGER NOT NULL DEFAULT 0,
    gp INTEGER NOT NULL DEFAULT 0,
    pp INTEGER NOT NULL DEFAULT 0,
    direction TEXT NOT NULL DEFAULT 'in' CHECK(direction IN ('in','out')),
    item_id INTEGER REFERENCES items(id),
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Critters (summon HP tracker)
CREATE TABLE IF NOT EXISTS critters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    character_id TEXT NOT NULL REFERENCES characters(id),
    hp_current INTEGER NOT NULL DEFAULT 0,
    hp_max INTEGER NOT NULL DEFAULT 0,
    ac INTEGER NOT NULL DEFAULT 10,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (journal)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_date TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body_json TEXT NOT NULL DEFAULT '{}',
    body_html TEXT NOT NULL DEFAULT '',
    xp_gained INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Session images
CREATE TABLE IF NOT EXISTS session_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL REFERENCES characters(id),
    skill_name TEXT NOT NULL,
    bonus INTEGER NOT NULL DEFAULT 0,
    proficient INTEGER NOT NULL DEFAULT 0,
    expertise INTEGER NOT NULL DEFAULT 0,
    UNIQUE(character_id, skill_name)
);

-- XP entries
CREATE TABLE IF NOT EXISTS xp_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
    game_date TEXT NOT NULL DEFAULT '',
    xp_amount INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- XP attendance
CREATE TABLE IF NOT EXISTS xp_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    xp_entry_id INTEGER NOT NULL REFERENCES xp_entries(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id),
    present INTEGER NOT NULL DEFAULT 1,
    UNIQUE(xp_entry_id, character_id)
);

-- Quests
CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','failed','on_hold')),
    game_date_added TEXT NOT NULL DEFAULT '',
    game_date_completed TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Watch schedules
CREATE TABLE IF NOT EXISTS watch_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Watch slots
CREATE TABLE IF NOT EXISTS watch_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES watch_schedules(id) ON DELETE CASCADE,
    watch_number INTEGER NOT NULL,
    character_id TEXT NOT NULL REFERENCES characters(id),
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL DEFAULT '',
    character_id TEXT REFERENCES characters(id),
    session_token TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Changelog
CREATE TABLE IF NOT EXISTS changelog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
    diff_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_game_date ON items(game_date);
CREATE INDEX IF NOT EXISTS idx_coin_ledger_game_date ON coin_ledger(game_date);
CREATE INDEX IF NOT EXISTS idx_critters_character ON critters(character_id);
CREATE INDEX IF NOT EXISTS idx_skills_character ON skills(character_id);
CREATE INDEX IF NOT EXISTS idx_xp_attendance_entry ON xp_attendance(xp_entry_id);
CREATE INDEX IF NOT EXISTS idx_changelog_table ON changelog(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_changelog_created ON changelog(created_at);
