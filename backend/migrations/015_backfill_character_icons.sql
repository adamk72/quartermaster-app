-- Backfill icons for existing characters that have none.
-- Uses a deterministic assignment based on rowid ordering.
UPDATE characters SET icon = 'Sword' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Shield' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Crown' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Flame' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Snowflake' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Zap' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Axe' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Moon' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Eye' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Gem' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Mountain' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Compass' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Feather' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
UPDATE characters SET icon = 'Star' WHERE icon = '' AND id = (SELECT id FROM characters WHERE icon = '' ORDER BY rowid LIMIT 1 OFFSET 0);
