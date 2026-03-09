package api

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListCritters(w http.ResponseWriter, r *http.Request) {
	query := "SELECT id, name, character_id, hp_current, hp_max, ac, notes, active, created_at, updated_at FROM critters"
	if r.URL.Query().Get("active") == "true" {
		query += " WHERE active = 1"
	}
	query += " ORDER BY name"

	rows, err := db.DB.Query(query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query critters")
		return
	}
	defer rows.Close()

	critters := []types.Critter{}
	for rows.Next() {
		var c types.Critter
		if err := rows.Scan(&c.ID, &c.Name, &c.CharacterID, &c.HPCurrent, &c.HPMax, &c.AC, &c.Notes, &c.Active, &c.CreatedAt, &c.UpdatedAt); err != nil {
			log.Printf("critter scan error: %v", err)
			continue
		}
		critters = append(critters, c)
	}
	writeJSON(w, http.StatusOK, critters)
}

func handleCreateCritter(w http.ResponseWriter, r *http.Request) {
	var c types.Critter
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now
	c.Active = true

	result, err := db.DB.Exec(
		"INSERT INTO critters (name, character_id, hp_current, hp_max, ac, notes, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		c.Name, c.CharacterID, c.HPCurrent, c.HPMax, c.AC, c.Notes, c.Active, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create critter: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	c.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", strconv.Itoa(c.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, c)
}

func handleUpdateCritter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Critter
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	c.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("critters", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE critters SET name=?, character_id=?, hp_current=?, hp_max=?, ac=?, notes=?, active=?, updated_at=? WHERE id=?",
			c.Name, c.CharacterID, c.HPCurrent, c.HPMax, c.AC, c.Notes, c.Active, c.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update critter")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "critter not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", id, "update", diffJSON)
	}

	idInt, _ := strconv.Atoi(id)
	c.ID = idInt
	writeJSON(w, http.StatusOK, c)
}

func handleDeleteCritter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM critters WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete critter")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "critter not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

func handleDismissAllCritters(w http.ResponseWriter, r *http.Request) {
	_, err := db.DB.Exec("UPDATE critters SET active = 0, updated_at = ?", time.Now())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to dismiss critters")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", "all", "update", `{"active":false}`)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "all dismissed"})
}
