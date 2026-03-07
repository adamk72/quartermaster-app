-- Pack animals (mounts) as first-class entities
CREATE TABLE IF NOT EXISTS mounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    carrying_capacity REAL,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add mount_id to containers so a container can belong to a mount
ALTER TABLE containers ADD COLUMN mount_id TEXT REFERENCES mounts(id) ON DELETE SET NULL;
