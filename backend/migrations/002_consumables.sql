-- Consumable types (rations, waterskins, torches, etc.)
CREATE TABLE IF NOT EXISTS consumable_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'units',
    per_person_per_day REAL NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Consumable ledger (tracks additions and deductions)
CREATE TABLE IF NOT EXISTS consumable_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consumable_type_id TEXT NOT NULL REFERENCES consumable_types(id),
    quantity REAL NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('in','out')),
    game_date TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    head_count INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumable_ledger_type ON consumable_ledger(consumable_type_id);

-- Seed default consumable types
INSERT OR IGNORE INTO consumable_types (id, name, unit, per_person_per_day, sort_order) VALUES
    ('rations', 'Rations', 'days', 1, 1),
    ('water', 'Water', 'gallons', 1, 2);
