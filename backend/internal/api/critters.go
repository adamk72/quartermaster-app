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
	rows, err := db.DB.Query(`SELECT id, name, template_id, character_id, instance_number,
		hp_current, hp_max, ac, speed, initiative,
		save_str, save_dex, save_con, save_int, save_wis, save_cha,
		notes, active, created_at, updated_at
		FROM critters ORDER BY name, instance_number`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query critters")
		return
	}
	defer rows.Close()

	critters := []types.Critter{}
	for rows.Next() {
		var c types.Critter
		if err := rows.Scan(&c.ID, &c.Name, &c.TemplateID, &c.CharacterID, &c.InstanceNumber,
			&c.HPCurrent, &c.HPMax, &c.AC, &c.Speed, &c.Initiative,
			&c.SaveSTR, &c.SaveDEX, &c.SaveCON, &c.SaveINT, &c.SaveWIS, &c.SaveCHA,
			&c.Notes, &c.Active, &c.CreatedAt, &c.UpdatedAt); err != nil {
			log.Printf("critter scan error: %v", err)
			continue
		}
		critters = append(critters, c)
	}
	writeJSON(w, http.StatusOK, critters)
}

func handleCreateCritter(w http.ResponseWriter, r *http.Request) {
	var req types.SummonRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Use transaction to look up template, get next instance number, and insert
	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	var t types.CritterTemplate
	err = tx.QueryRow(`SELECT id, name, hp_max, ac, speed, initiative,
		save_str, save_dex, save_con, save_int, save_wis, save_cha, notes, next_instance
		FROM critter_templates WHERE id = ?`, req.TemplateID).Scan(
		&t.ID, &t.Name, &t.HPMax, &t.AC, &t.Speed, &t.Initiative,
		&t.SaveSTR, &t.SaveDEX, &t.SaveCON, &t.SaveINT, &t.SaveWIS, &t.SaveCHA,
		&t.Notes, &t.NextInstance)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "template not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to look up template: %v", err))
		return
	}

	now := time.Now()
	instanceNumber := t.NextInstance

	// Atomically increment next_instance on the template
	if _, err = tx.Exec("UPDATE critter_templates SET next_instance = next_instance + 1 WHERE id = ?", t.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to increment instance counter")
		return
	}

	result, err := tx.Exec(
		`INSERT INTO critters (name, template_id, character_id, instance_number,
			hp_current, hp_max, ac, speed, initiative,
			save_str, save_dex, save_con, save_int, save_wis, save_cha,
			notes, active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.ID, req.CharacterID, instanceNumber,
		t.HPMax, t.HPMax, t.AC, t.Speed, t.Initiative,
		t.SaveSTR, t.SaveDEX, t.SaveCON, t.SaveINT, t.SaveWIS, t.SaveCHA,
		t.Notes, true, now, now,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to summon critter: %v", err))
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	id, _ := result.LastInsertId()
	c := types.Critter{
		ID:             int(id),
		Name:           t.Name,
		TemplateID:     &t.ID,
		CharacterID:    req.CharacterID,
		InstanceNumber: instanceNumber,
		HPCurrent:      t.HPMax,
		HPMax:          t.HPMax,
		AC:             t.AC,
		Speed:          t.Speed,
		Initiative:     t.Initiative,
		SaveSTR:        t.SaveSTR,
		SaveDEX:        t.SaveDEX,
		SaveCON:        t.SaveCON,
		SaveINT:        t.SaveINT,
		SaveWIS:        t.SaveWIS,
		SaveCHA:        t.SaveCHA,
		Notes:          t.Notes,
		Active:         true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

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
			`UPDATE critters SET name=?, character_id=?, instance_number=?,
				hp_current=?, hp_max=?, ac=?, speed=?, initiative=?,
				save_str=?, save_dex=?, save_con=?, save_int=?, save_wis=?, save_cha=?,
				notes=?, active=?, updated_at=?
			WHERE id=?`,
			c.Name, c.CharacterID, c.InstanceNumber,
			c.HPCurrent, c.HPMax, c.AC, c.Speed, c.Initiative,
			c.SaveSTR, c.SaveDEX, c.SaveCON, c.SaveINT, c.SaveWIS, c.SaveCHA,
			c.Notes, c.Active, c.UpdatedAt, id,
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
	result, err := db.DB.Exec("DELETE FROM critters")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to dismiss critters")
		return
	}
	count, _ := result.RowsAffected()
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critters", "all", "delete", fmt.Sprintf(`{"count":%d}`, count))
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "all dismissed"})
}
