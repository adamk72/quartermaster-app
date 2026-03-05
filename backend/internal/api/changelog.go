package api

import (
	"net/http"
	"strconv"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListChangelog(w http.ResponseWriter, r *http.Request) {
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	query := "SELECT id, user_id, table_name, record_id, action, diff_json, created_at FROM changelog"
	args := []any{}

	if table := r.URL.Query().Get("table"); table != "" {
		query += " WHERE table_name = ?"
		args = append(args, table)
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query changelog")
		return
	}
	defer rows.Close()

	entries := []types.ChangelogEntry{}
	for rows.Next() {
		var e types.ChangelogEntry
		rows.Scan(&e.ID, &e.UserID, &e.TableName, &e.RecordID, &e.Action, &e.DiffJSON, &e.CreatedAt)
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}
