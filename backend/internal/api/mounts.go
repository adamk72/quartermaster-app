package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListMounts(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, carrying_capacity, notes, active, created_at, updated_at FROM mounts ORDER BY name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query mounts")
		return
	}
	defer rows.Close()

	mounts := []types.Mount{}
	for rows.Next() {
		var m types.Mount
		if err := rows.Scan(&m.ID, &m.Name, &m.CarryingCapacity, &m.Notes, &m.Active, &m.CreatedAt, &m.UpdatedAt); err != nil {
			continue
		}
		mounts = append(mounts, m)
	}
	writeJSON(w, http.StatusOK, mounts)
}

func handleGetMount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var m types.Mount
	err := db.DB.QueryRow("SELECT id, name, carrying_capacity, notes, active, created_at, updated_at FROM mounts WHERE id = ?", id).
		Scan(&m.ID, &m.Name, &m.CarryingCapacity, &m.Notes, &m.Active, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "mount not found")
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func handleCreateMount(w http.ResponseWriter, r *http.Request) {
	var m types.Mount
	if err := readJSON(r, &m); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if m.ID == "" {
		m.ID = strings.ToLower(strings.ReplaceAll(m.Name, " ", "-"))
	}
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now
	m.Active = true

	_, err := db.DB.Exec(
		"INSERT INTO mounts (id, name, carrying_capacity, notes, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		m.ID, m.Name, m.CarryingCapacity, m.Notes, m.Active, m.CreatedAt, m.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			writeError(w, http.StatusConflict, fmt.Sprintf("a mount with ID %q already exists", m.ID))
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create mount")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "mounts", m.ID, "create", "{}")
	}

	writeJSON(w, http.StatusCreated, m)
}

func handleUpdateMount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var m types.Mount
	if err := readJSON(r, &m); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	m.UpdatedAt = time.Now()
	result, err := db.DB.Exec(
		"UPDATE mounts SET name=?, carrying_capacity=?, notes=?, active=?, updated_at=? WHERE id=?",
		m.Name, m.CarryingCapacity, m.Notes, m.Active, m.UpdatedAt, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update mount")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "mount not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "mounts", id, "update", "{}")
	}

	m.ID = id
	writeJSON(w, http.StatusOK, m)
}

func handleDeleteMount(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM mounts WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete mount")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "mount not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "mounts", id, "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}
