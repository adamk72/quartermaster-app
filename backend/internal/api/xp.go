package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListXP(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, session_id, game_date, xp_amount, description, created_at FROM xp_entries ORDER BY game_date DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query xp entries")
		return
	}
	defer rows.Close()

	entries := []types.XPEntry{}
	for rows.Next() {
		var e types.XPEntry
		if err := rows.Scan(&e.ID, &e.SessionID, &e.GameDate, &e.XPAmount, &e.Description, &e.CreatedAt); err != nil {
			continue
		}

		// Load attendance
		aRows, err := db.DB.Query("SELECT id, xp_entry_id, character_id, present FROM xp_attendance WHERE xp_entry_id = ?", e.ID)
		if err == nil {
			for aRows.Next() {
				var a types.XPAttendance
				if err := aRows.Scan(&a.ID, &a.XPEntryID, &a.CharacterID, &a.Present); err != nil {
					continue
				}
				e.Attendance = append(e.Attendance, a)
			}
			aRows.Close()
		}
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}

func handleCreateXP(w http.ResponseWriter, r *http.Request) {
	var e types.XPEntry
	if err := readJSON(r, &e); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.CreatedAt = time.Now()

	result, err := db.DB.Exec(
		"INSERT INTO xp_entries (session_id, game_date, xp_amount, description, created_at) VALUES (?, ?, ?, ?, ?)",
		e.SessionID, e.GameDate, e.XPAmount, e.Description, e.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create xp entry: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	e.ID = int(id)

	// Insert attendance records
	for i := range e.Attendance {
		e.Attendance[i].XPEntryID = e.ID
		aResult, _ := db.DB.Exec(
			"INSERT INTO xp_attendance (xp_entry_id, character_id, present) VALUES (?, ?, ?)",
			e.ID, e.Attendance[i].CharacterID, e.Attendance[i].Present,
		)
		if aResult != nil {
			aID, _ := aResult.LastInsertId()
			e.Attendance[i].ID = int(aID)
		}
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "xp_entries", strconv.Itoa(e.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, e)
}

func handleUpdateXP(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var e types.XPEntry
	if err := readJSON(r, &e); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := db.DB.Exec(
		"UPDATE xp_entries SET session_id=?, game_date=?, xp_amount=?, description=? WHERE id=?",
		e.SessionID, e.GameDate, e.XPAmount, e.Description, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update xp entry")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "xp entry not found")
		return
	}

	// Replace attendance in a transaction
	idInt, _ := strconv.Atoi(id)
	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM xp_attendance WHERE xp_entry_id = ?", id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete existing attendance")
		return
	}
	for i := range e.Attendance {
		e.Attendance[i].XPEntryID = idInt
		aResult, err := tx.Exec(
			"INSERT INTO xp_attendance (xp_entry_id, character_id, present) VALUES (?, ?, ?)",
			idInt, e.Attendance[i].CharacterID, e.Attendance[i].Present,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to insert attendance")
			return
		}
		aID, _ := aResult.LastInsertId()
		e.Attendance[i].ID = int(aID)
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit attendance")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "xp_entries", id, "update", "{}")
	}

	e.ID = idInt
	writeJSON(w, http.StatusOK, e)
}

func handleDeleteXP(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM xp_entries WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete xp entry")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "xp entry not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "xp_entries", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

type XPTotal struct {
	CharacterID   string `json:"character_id"`
	CharacterName string `json:"character_name"`
	TotalXP       int    `json:"total_xp"`
	Level         int    `json:"level"`
}

var xpThresholds = []struct {
	level int
	xp    int
}{
	{1, 0}, {2, 300}, {3, 900}, {4, 2700}, {5, 6500},
	{6, 14000}, {7, 23000}, {8, 34000}, {9, 48000}, {10, 64000},
	{11, 85000}, {12, 100000}, {13, 120000}, {14, 140000}, {15, 165000},
	{16, 195000}, {17, 225000}, {18, 265000}, {19, 305000}, {20, 355000},
}

func xpToLevel(xp int) int {
	level := 1
	for _, t := range xpThresholds {
		if xp >= t.xp {
			level = t.level
		}
	}
	return level
}

func handleXPTotals(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT c.id, c.name, COALESCE(SUM(x.xp_amount), 0) as total_xp
		FROM characters c
		LEFT JOIN xp_attendance a ON a.character_id = c.id AND a.present = 1
		LEFT JOIN xp_entries x ON x.id = a.xp_entry_id
		GROUP BY c.id, c.name
		ORDER BY c.name
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query xp totals")
		return
	}
	defer rows.Close()

	totals := []XPTotal{}
	for rows.Next() {
		var t XPTotal
		if err := rows.Scan(&t.CharacterID, &t.CharacterName, &t.TotalXP); err != nil {
			continue
		}
		t.Level = xpToLevel(t.TotalXP)
		totals = append(totals, t)
	}
	writeJSON(w, http.StatusOK, totals)
}
