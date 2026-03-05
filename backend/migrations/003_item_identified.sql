ALTER TABLE items ADD COLUMN identified INTEGER NOT NULL DEFAULT 1;

-- Mark existing Magic items with TBI in notes as unidentified
UPDATE items SET identified = 0 WHERE category = 'Magic' AND (notes LIKE '%TBI%' OR notes LIKE '%to be identified%');
