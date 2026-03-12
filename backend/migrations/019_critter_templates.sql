-- Create critter_templates table
CREATE TABLE IF NOT EXISTS critter_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hp_max INTEGER NOT NULL DEFAULT 0,
    ac INTEGER NOT NULL DEFAULT 10,
    speed INTEGER NOT NULL DEFAULT 30,
    initiative INTEGER NOT NULL DEFAULT 0,
    save_str INTEGER NOT NULL DEFAULT 0,
    save_dex INTEGER NOT NULL DEFAULT 0,
    save_con INTEGER NOT NULL DEFAULT 0,
    save_int INTEGER NOT NULL DEFAULT 0,
    save_wis INTEGER NOT NULL DEFAULT 0,
    save_cha INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    next_instance INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to critters
ALTER TABLE critters ADD COLUMN template_id INTEGER REFERENCES critter_templates(id);
ALTER TABLE critters ADD COLUMN instance_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE critters ADD COLUMN speed INTEGER NOT NULL DEFAULT 30;
ALTER TABLE critters ADD COLUMN initiative INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_str INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_dex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_con INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_int INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_wis INTEGER NOT NULL DEFAULT 0;
ALTER TABLE critters ADD COLUMN save_cha INTEGER NOT NULL DEFAULT 0;

-- Migrate existing critters: create a template from the most recent critter of each name
INSERT INTO critter_templates (name, hp_max, ac, notes)
SELECT name, hp_max, ac, notes
FROM critters
WHERE id IN (SELECT MAX(id) FROM critters GROUP BY name);

-- Link existing critters to their templates
UPDATE critters SET template_id = (
    SELECT ct.id FROM critter_templates ct WHERE ct.name = critters.name
);

-- Delete dismissed critters (active=0) — instances are now ephemeral
DELETE FROM critters WHERE active = 0;

-- Assign distinct instance numbers to existing same-name critters
-- Uses rowid ordering within each name group
UPDATE critters SET instance_number = (
    SELECT COUNT(*) FROM critters c2
    WHERE c2.name = critters.name AND c2.id <= critters.id
);

-- Set next_instance on templates to max existing instance + 1
UPDATE critter_templates SET next_instance = (
    SELECT COALESCE(MAX(c.instance_number), 0) + 1
    FROM critters c WHERE c.name = critter_templates.name
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_critter_templates_name ON critter_templates(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_critters_name_instance ON critters(name, instance_number);
