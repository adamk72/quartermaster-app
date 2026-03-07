package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListCharacters(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, player_name, class, level, race, ac, hp_max, notes, created_at, updated_at FROM characters ORDER BY name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query characters")
		return
	}
	defer rows.Close()

	chars := []types.Character{}
	for rows.Next() {
		var c types.Character
		rows.Scan(&c.ID, &c.Name, &c.PlayerName, &c.Class, &c.Level, &c.Race, &c.AC, &c.HPMax, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
		chars = append(chars, c)
	}
	writeJSON(w, http.StatusOK, chars)
}

func handleGetCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Character
	err := db.DB.QueryRow("SELECT id, name, player_name, class, level, race, ac, hp_max, notes, created_at, updated_at FROM characters WHERE id = ?", id).
		Scan(&c.ID, &c.Name, &c.PlayerName, &c.Class, &c.Level, &c.Race, &c.AC, &c.HPMax, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func handleCreateCharacter(w http.ResponseWriter, r *http.Request) {
	var c types.Character
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if c.ID == "" {
		c.ID = strings.ToLower(strings.ReplaceAll(c.Name, " ", "-"))
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	_, err := db.DB.Exec(
		"INSERT INTO characters (id, name, player_name, class, level, race, ac, hp_max, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		c.ID, c.Name, c.PlayerName, c.Class, c.Level, c.Race, c.AC, c.HPMax, c.Notes, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create character: %v", err))
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "characters", c.ID, "create", "{}")
	}

	writeJSON(w, http.StatusCreated, c)
}

func handleUpdateCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Character
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	c.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("characters", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE characters SET name=?, player_name=?, class=?, level=?, race=?, ac=?, hp_max=?, notes=?, updated_at=? WHERE id=?",
			c.Name, c.PlayerName, c.Class, c.Level, c.Race, c.AC, c.HPMax, c.Notes, c.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update character")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "characters", id, "update", diffJSON)
	}

	c.ID = id
	writeJSON(w, http.StatusOK, c)
}

func handleDeleteCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM characters WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete character")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "characters", id, "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}
