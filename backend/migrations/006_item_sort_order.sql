ALTER TABLE items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order based on current ordering (game_date DESC, name ASC)
UPDATE items SET sort_order = (
    SELECT COUNT(*) FROM items AS i2
    WHERE i2.game_date > items.game_date
       OR (i2.game_date = items.game_date AND i2.name < items.name)
       OR (i2.game_date = items.game_date AND i2.name = items.name AND i2.id < items.id)
);
