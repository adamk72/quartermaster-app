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

func handleListCritterTemplates(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`SELECT id, name, hp_max, ac, speed, initiative,
		save_str, save_dex, save_con, save_int, save_wis, save_cha,
		notes, next_instance, created_at, updated_at
		FROM critter_templates ORDER BY name`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query critter templates")
		return
	}
	defer rows.Close()

	templates := []types.CritterTemplate{}
	for rows.Next() {
		var t types.CritterTemplate
		if err := rows.Scan(&t.ID, &t.Name, &t.HPMax, &t.AC, &t.Speed, &t.Initiative,
			&t.SaveSTR, &t.SaveDEX, &t.SaveCON, &t.SaveINT, &t.SaveWIS, &t.SaveCHA,
			&t.Notes, &t.NextInstance, &t.CreatedAt, &t.UpdatedAt); err != nil {
			log.Printf("critter template scan error: %v", err)
			continue
		}
		templates = append(templates, t)
	}
	writeJSON(w, http.StatusOK, templates)
}

func handleCreateCritterTemplate(w http.ResponseWriter, r *http.Request) {
	var t types.CritterTemplate
	if err := readJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now

	t.NextInstance = 1
	result, err := db.DB.Exec(
		`INSERT INTO critter_templates (name, hp_max, ac, speed, initiative,
			save_str, save_dex, save_con, save_int, save_wis, save_cha,
			notes, next_instance, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.Name, t.HPMax, t.AC, t.Speed, t.Initiative,
		t.SaveSTR, t.SaveDEX, t.SaveCON, t.SaveINT, t.SaveWIS, t.SaveCHA,
		t.Notes, t.NextInstance, t.CreatedAt, t.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create critter template: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	t.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", strconv.Itoa(t.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, t)
}

func handleUpdateCritterTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var t types.CritterTemplate
	if err := readJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	t.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("critter_templates", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			`UPDATE critter_templates SET name=?, hp_max=?, ac=?, speed=?, initiative=?,
				save_str=?, save_dex=?, save_con=?, save_int=?, save_wis=?, save_cha=?,
				notes=?, updated_at=?
			WHERE id=?`,
			t.Name, t.HPMax, t.AC, t.Speed, t.Initiative,
			t.SaveSTR, t.SaveDEX, t.SaveCON, t.SaveINT, t.SaveWIS, t.SaveCHA,
			t.Notes, t.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update critter template")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "critter template not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", id, "update", diffJSON)
	}

	idInt, _ := strconv.Atoi(id)
	t.ID = idInt
	writeJSON(w, http.StatusOK, t)
}

func handleDeleteCritterTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	// Detach any critters referencing this template before deleting
	db.DB.Exec("UPDATE critters SET template_id = NULL WHERE template_id = ?", id)
	result, err := db.DB.Exec("DELETE FROM critter_templates WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete critter template")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "critter template not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "critter_templates", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}
