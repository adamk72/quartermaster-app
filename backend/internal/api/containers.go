package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

func handleListContainers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, type, character_id, mount_id, weight_limit, location, notes, created_at, updated_at FROM containers ORDER BY name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query containers")
		return
	}
	defer rows.Close()

	containers := []types.Container{}
	for rows.Next() {
		var c types.Container
		if err := rows.Scan(&c.ID, &c.Name, &c.Type, &c.CharacterID, &c.MountID, &c.WeightLimit, &c.Location, &c.Notes, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		containers = append(containers, c)
	}
	writeJSON(w, http.StatusOK, containers)
}

func handleGetContainer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c types.Container
	err := db.DB.QueryRow("SELECT id, name, type, character_id, mount_id, weight_limit, location, notes, created_at, updated_at FROM containers WHERE id = ?", id).
		Scan(&c.ID, &c.Name, &c.Type, &c.CharacterID, &c.MountID, &c.WeightLimit, &c.Location, &c.Notes, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "container not found")
		return
	}

	// Load items for this container
	rows, err := db.DB.Query("SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at FROM items WHERE container_id = ? ORDER BY sort_order, name", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query container items")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var item types.Item
		if err := rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.AttunedTo, &item.Singular, &item.Notes, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt); err != nil {
			continue
		}
		c.Items = append(c.Items, item)
		if item.WeightOverride != nil {
			c.TotalWeight += *item.WeightOverride
		} else if item.UnitWeightLbs != nil {
			c.TotalWeight += *item.UnitWeightLbs * float64(item.Quantity)
		}
	}

	writeJSON(w, http.StatusOK, c)
}

func handleCreateContainer(w http.ResponseWriter, r *http.Request) {
	var c types.Container
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
	result, err := db.DB.Exec(
		"UPDATE containers SET name=?, type=?, character_id=?, mount_id=?, weight_limit=?, location=?, notes=?, updated_at=? WHERE id=?",
		c.Name, c.Type, c.CharacterID, c.MountID, c.WeightLimit, c.Location, c.Notes, c.UpdatedAt, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update container")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "container not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "containers", id, "update", "{}")
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
