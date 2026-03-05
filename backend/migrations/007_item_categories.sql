-- Expand item categories: split Magic into Implements, Potions, Weapons & Armor
-- SQLite requires table recreation to change a CHECK constraint
PRAGMA foreign_keys=OFF;

CREATE TABLE items_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    credit_gp REAL,
    debit_gp REAL,
    game_date TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Item' CHECK(category IN ('Magic','Implements','Potions','Weapons & Armor','Item','Treasure','Expense','Coin')),
    container_id TEXT REFERENCES containers(id),
    sold INTEGER NOT NULL DEFAULT 0,
    unit_weight_lbs REAL,
    unit_value_gp REAL,
    weight_override REAL,
    added_to_dndbeyond INTEGER NOT NULL DEFAULT 0,
    singular TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    identified INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO items_new SELECT * FROM items;
DROP TABLE items;
ALTER TABLE items_new RENAME TO items;

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
CREATE INDEX IF NOT EXISTS idx_items_sold ON items(sold);

PRAGMA foreign_keys=ON;
