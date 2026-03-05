package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListWatchSchedules(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, active, created_at FROM watch_schedules ORDER BY created_at DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query watch schedules")
		return
	}
	defer rows.Close()

	schedules := []types.WatchSchedule{}
	for rows.Next() {
		var s types.WatchSchedule
		if err := rows.Scan(&s.ID, &s.Name, &s.Active, &s.CreatedAt); err != nil {
			continue
		}

		// Load slots
		slotRows, err := db.DB.Query("SELECT id, schedule_id, watch_number, character_id, sort_order FROM watch_slots WHERE schedule_id = ? ORDER BY watch_number, sort_order", s.ID)
		if err == nil {
			for slotRows.Next() {
				var slot types.WatchSlot
				if err := slotRows.Scan(&slot.ID, &slot.ScheduleID, &slot.WatchNumber, &slot.CharacterID, &slot.SortOrder); err != nil {
					continue
				}
				s.Slots = append(s.Slots, slot)
			}
			slotRows.Close()
		}
		schedules = append(schedules, s)
	}
	writeJSON(w, http.StatusOK, schedules)
}

func handleCreateWatchSchedule(w http.ResponseWriter, r *http.Request) {
	var s types.WatchSchedule
	if err := readJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	s.CreatedAt = time.Now()
	s.Active = true

	result, err := db.DB.Exec(
		"INSERT INTO watch_schedules (name, active, created_at) VALUES (?, ?, ?)",
		s.Name, s.Active, s.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create schedule: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	s.ID = int(id)

	// Insert slots
	for i := range s.Slots {
		s.Slots[i].ScheduleID = s.ID
		slotResult, _ := db.DB.Exec(
			"INSERT INTO watch_slots (schedule_id, watch_number, character_id, sort_order) VALUES (?, ?, ?, ?)",
			s.ID, s.Slots[i].WatchNumber, s.Slots[i].CharacterID, s.Slots[i].SortOrder,
		)
		if slotResult != nil {
			slotID, _ := slotResult.LastInsertId()
			s.Slots[i].ID = int(slotID)
		}
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "watch_schedules", strconv.Itoa(s.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, s)
}

func handleUpdateWatchSchedule(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var s types.WatchSchedule
	if err := readJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := db.DB.Exec("UPDATE watch_schedules SET name=?, active=? WHERE id=?", s.Name, s.Active, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update schedule")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "schedule not found")
		return
	}

	// Replace slots in a transaction
	idInt, _ := strconv.Atoi(id)
	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM watch_slots WHERE schedule_id = ?", id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete existing slots")
		return
	}
	for i := range s.Slots {
		s.Slots[i].ScheduleID = idInt
		slotResult, err := tx.Exec(
			"INSERT INTO watch_slots (schedule_id, watch_number, character_id, sort_order) VALUES (?, ?, ?, ?)",
			idInt, s.Slots[i].WatchNumber, s.Slots[i].CharacterID, s.Slots[i].SortOrder,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to insert slot")
			return
		}
		slotID, _ := slotResult.LastInsertId()
		s.Slots[i].ID = int(slotID)
	}
	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit slots")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "watch_schedules", id, "update", "{}")
	}

	s.ID = idInt
	writeJSON(w, http.StatusOK, s)
}

func handleDeleteWatchSchedule(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM watch_schedules WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete schedule")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "schedule not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "watch_schedules", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}
