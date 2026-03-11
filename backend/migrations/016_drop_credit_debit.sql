-- Migrate credit_gp/debit_gp data from items into coin_ledger, then drop the columns.
-- credit_gp values may be fractional (e.g. 2.5 gp), so we split into gp + sp + cp.

-- Items with credit_gp → coin_ledger 'in' entries
-- Use ROUND() to avoid floating-point precision issues with modular arithmetic
INSERT INTO coin_ledger (game_date, description, gp, sp, cp, direction, item_id, created_at)
SELECT
    game_date,
    'Migrated credit: ' || name,
    CAST(ROUND(credit_gp - 0.5) AS INTEGER),
    CAST(ROUND(credit_gp * 10) % 10 AS INTEGER),
    CAST(ROUND(credit_gp * 100) % 10 AS INTEGER),
    'in',
    id,
    CURRENT_TIMESTAMP
FROM items WHERE credit_gp IS NOT NULL AND credit_gp > 0;

-- Items with debit_gp → coin_ledger 'out' entries
INSERT INTO coin_ledger (game_date, description, gp, sp, cp, direction, item_id, created_at)
SELECT
    game_date,
    'Migrated debit: ' || name,
    CAST(ROUND(debit_gp - 0.5) AS INTEGER),
    CAST(ROUND(debit_gp * 10) % 10 AS INTEGER),
    CAST(ROUND(debit_gp * 100) % 10 AS INTEGER),
    'out',
    id,
    CURRENT_TIMESTAMP
FROM items WHERE debit_gp IS NOT NULL AND debit_gp > 0;

-- Drop the columns (SQLite 3.35.0+)
ALTER TABLE items DROP COLUMN credit_gp;
ALTER TABLE items DROP COLUMN debit_gp;
