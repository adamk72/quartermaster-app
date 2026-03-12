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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_critter_templates_name ON critter_templates(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_critters_name_instance ON critters(name, instance_number);
