-- Optimistic locking: version column for conflict detection
ALTER TABLE items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE containers ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
