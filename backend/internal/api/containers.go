package api

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListContainers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, type, character_id, mount_id, weight_limit, location, notes, created_at, updated_at, version FROM containers ORDER BY name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query containers")
		return
	}
	defer rows.Close()

	containers := []types.Container{}
	for rows.Next() {
		var c types.Container
		if err := rows.Scan(&c.ID, &c.Name, &c.Type, &c.CharacterID, &c.MountID, &c.WeightLimit, &c.Location, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.Version); err != nil {
			log.Printf("container scan error: %v", err)
			continue
		}
		containers = append(containers, c)
	}
	writeJSON(w, http.StatusOK, containers)
}

func handleGetContainer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Container
	err := db.DB.QueryRow("SELECT id, name, type, character_id, mount_id, weight_limit, location, notes, created_at, updated_at, version FROM containers WHERE id = ?", id).
		Scan(&c.ID, &c.Name, &c.Type, &c.CharacterID, &c.MountID, &c.WeightLimit, &c.Location, &c.Notes, &c.CreatedAt, &c.UpdatedAt, &c.Version)
	if err != nil {
		writeError(w, http.StatusNotFound, "container not found")
		return
	}

	// Load items for this container
	rows, err := db.DB.Query("SELECT "+itemColumns+" FROM items WHERE container_id = ? ORDER BY sort_order, name", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query container items")
		return
	}
	defer rows.Close()
	c.Items = scanItems(rows)
	for _, item := range c.Items {
		if item.WeightOverride != nil {
			c.TotalWeight += *item.WeightOverride
		} else if item.UnitWeightLbs != nil {
			c.TotalWeight += *item.UnitWeightLbs * float64(item.Quantity)
		}
	}

	loadItemLabels(c.Items)
	writeJSON(w, http.StatusOK, c)
}

func handleCreateContainer(w http.ResponseWriter, r *http.Request) {
	var c types.Container
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if c.ID == "" {
		base := strings.ToLower(strings.ReplaceAll(c.Name, " ", "-"))
		c.ID = base
		// If the generated ID already exists, append a numeric suffix
		for i := 2; ; i++ {
			var exists bool
			db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM containers WHERE id = ?)", c.ID).Scan(&exists)
			if !exists {
				break
			}
			c.ID = fmt.Sprintf("%s-%d", base, i)
		}
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	_, err := db.DB.Exec(
		"INSERT INTO containers (id, name, type, character_id, mount_id, weight_limit, location, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		c.ID, c.Name, c.Type, c.CharacterID, c.MountID, c.WeightLimit, c.Location, c.Notes, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			writeError(w, http.StatusConflict, fmt.Sprintf("a container with ID %q already exists", c.ID))
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create container")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "containers", c.ID, "create", "{}")
	}

	writeJSON(w, http.StatusCreated, c)
}

func handleUpdateContainer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Container
	if err := readJSON(r, &c); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	c.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("containers", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE containers SET name=?, type=?, character_id=?, mount_id=?, weight_limit=?, location=?, notes=?, updated_at=?, version=version+1 WHERE id=? AND version=?",
			c.Name, c.Type, c.CharacterID, c.MountID, c.WeightLimit, c.Location, c.Notes, c.UpdatedAt, id, c.Version,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update container")
		return
	}
	if checkVersionConflict(w, "containers", id, n, "container") {
		return
	}
	c.Version++ // reflect the incremented version in the response

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "containers", id, "update", diffJSON)
	}

	c.ID = id
	writeJSON(w, http.StatusOK, c)
}

func handleDeleteContainer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM containers WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete container")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "container not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "containers", id, "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}
