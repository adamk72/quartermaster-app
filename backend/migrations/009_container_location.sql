-- Add location field to containers for caches, safe houses, etc.
ALTER TABLE containers ADD COLUMN location TEXT NOT NULL DEFAULT '';
