-- Add attunement tracking: which character an item is attuned to
ALTER TABLE items ADD COLUMN attuned_to TEXT REFERENCES characters(id);
