-- Label system: replaces single category column with flexible multi-label tags

CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#888888',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_labels (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_item_labels_item ON item_labels(item_id);
CREATE INDEX IF NOT EXISTS idx_item_labels_label ON item_labels(label_id);

-- Seed default labels from existing categories (colors match theme)
INSERT OR IGNORE INTO labels (id, name, color, sort_order) VALUES
    ('magic',        'Magic',           '#8b6cc1', 0),
    ('implements',   'Implements',      '#8b6cc1', 1),
    ('potions',      'Potions',         '#4a9e6e', 2),
    ('weapons-armor','Weapons & Armor', '#5b8fb9', 3),
    ('item',         'Item',            '#7d7568', 4),
    ('treasure',     'Treasure',        '#c8a951', 5),
    ('expense',      'Expense',         '#a63d5b', 6),
    ('coin',         'Coin',            '#c8a951', 7);

-- Migrate existing item categories to item_labels
INSERT OR IGNORE INTO item_labels (item_id, label_id)
SELECT id, CASE category
    WHEN 'Magic' THEN 'magic'
    WHEN 'Implements' THEN 'implements'
    WHEN 'Potions' THEN 'potions'
    WHEN 'Weapons & Armor' THEN 'weapons-armor'
    WHEN 'Item' THEN 'item'
    WHEN 'Treasure' THEN 'treasure'
    WHEN 'Expense' THEN 'expense'
    WHEN 'Coin' THEN 'coin'
END
FROM items WHERE category IS NOT NULL AND category != '';
