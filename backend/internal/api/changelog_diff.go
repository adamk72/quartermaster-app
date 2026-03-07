package api

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/adamk72/quartermaster-app/internal/db"
)

// Fields excluded from diffs (internal bookkeeping, not meaningful changes).
var diffSkipFields = map[string]bool{
	"id": true, "created_at": true, "updated_at": true, "version": true,
}

// selectRowAsMap reads a single row from table by primary key, returning column->value pairs.
// pkCol defaults to "id" when empty.
func selectRowAsMap(tx *sql.Tx, table string, pkCol string, id any) (map[string]any, error) {
	if pkCol == "" {
		pkCol = "id"
	}
	rows, err := tx.Query("SELECT * FROM "+table+" WHERE "+pkCol+" = ?", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, sql.ErrNoRows
	}

	cols, _ := rows.Columns()
	vals := make([]any, len(cols))
	ptrs := make([]any, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return nil, err
	}

	result := make(map[string]any, len(cols))
	for i, col := range cols {
		v := vals[i]
		if b, ok := v.([]byte); ok {
			v = string(b)
		}
		result[col] = v
	}
	return result, nil
}

// computeDiff compares old and new row maps, returning a JSON string of changed fields.
// Format: {"field": {"old": value, "new": value}, ...}
func computeDiff(old, newRow map[string]any) string {
	if old == nil || newRow == nil {
		return "{}"
	}
	diff := map[string]map[string]any{}
	for col, newVal := range newRow {
		if diffSkipFields[col] {
			continue
		}
		oldVal := old[col]
		if fmt.Sprintf("%v", oldVal) != fmt.Sprintf("%v", newVal) {
			diff[col] = map[string]any{"old": oldVal, "new": newVal}
		}
	}
	if len(diff) == 0 {
		return "{}"
	}
	b, _ := json.Marshal(diff)
	return string(b)
}

// diffUpdate wraps a transactional SELECT→UPDATE→SELECT→diff pattern.
// It SELECTs the old row, runs updateFn within the transaction, SELECTs the new row,
// and computes the diff. Returns the diff JSON, rows affected, and any error.
// The transaction is committed only if the UPDATE affected rows.
func diffUpdate(table string, id any, updateFn func(tx *sql.Tx) (sql.Result, error)) (string, int64, error) {
	return diffUpdatePK(table, "id", id, updateFn)
}

// diffUpdatePK is like diffUpdate but allows specifying a custom primary key column name.
func diffUpdatePK(table string, pkCol string, id any, updateFn func(tx *sql.Tx) (sql.Result, error)) (string, int64, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return "{}", 0, err
	}
	defer tx.Rollback()

	old, _ := selectRowAsMap(tx, table, pkCol, id)

	result, err := updateFn(tx)
	if err != nil {
		return "{}", 0, err
	}

	n, _ := result.RowsAffected()
	if n == 0 {
		return "{}", 0, nil
	}

	var diff string
	if old != nil {
		if newRow, err := selectRowAsMap(tx, table, pkCol, id); err == nil {
			diff = computeDiff(old, newRow)
		}
	}
	if diff == "" {
		diff = "{}"
	}

	if err := tx.Commit(); err != nil {
		return "{}", n, err
	}

	return diff, n, nil
}
