package api

import (
	"net/http"

	"github.com/adamk72/quartermaster-app/internal/db"
)

// checkVersionConflict checks whether zero rows affected means "not found" (404)
// or "version mismatch" (409). Returns true if a response was written (caller should return).
func checkVersionConflict(w http.ResponseWriter, table string, id any, n int64, resourceName string) bool {
	if n > 0 {
		return false
	}

	var exists bool
	db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM "+table+" WHERE id = ?)", id).Scan(&exists)
	if exists {
		writeError(w, http.StatusConflict, "conflict: this record was modified by another user — please refresh and try again")
	} else {
		writeError(w, http.StatusNotFound, resourceName+" not found")
	}
	return true
}
