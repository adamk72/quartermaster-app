-- Make character_id nullable on critters (owner assigned after summon)
-- SQLite requires table recreation to change NOT NULL constraint
CREATE TABLE critters_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    character_id TEXT REFERENCES characters(id),
    hp_current INTEGER NOT NULL DEFAULT 0,
    hp_max INTEGER NOT NULL DEFAULT 0,
    ac INTEGER NOT NULL DEFAULT 10,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    template_id INTEGER REFERENCES critter_templates(id),
    instance_number INTEGER NOT NULL DEFAULT 1,
    speed INTEGER NOT NULL DEFAULT 30,
    initiative INTEGER NOT NULL DEFAULT 0,
    save_str INTEGER NOT NULL DEFAULT 0,
    save_dex INTEGER NOT NULL DEFAULT 0,
    save_con INTEGER NOT NULL DEFAULT 0,
    save_int INTEGER NOT NULL DEFAULT 0,
    save_wis INTEGER NOT NULL DEFAULT 0,
    save_cha INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO critters_new SELECT * FROM critters;
DROP TABLE critters;
ALTER TABLE critters_new RENAME TO critters;

CREATE UNIQUE INDEX IF NOT EXISTS idx_critters_name_instance ON critters(name, instance_number);
