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

func handleListQuests(w http.ResponseWriter, r *http.Request) {
	query := "SELECT id, title, description, status, game_date_added, game_date_completed, notes, sort_order, created_at, updated_at FROM quests"

	if status := r.URL.Query().Get("status"); status != "" {
		query += " WHERE status = ?"
		rows, err := db.DB.Query(query+" ORDER BY sort_order, title", status)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to query quests")
			return
		}
		defer rows.Close()
		writeQuestRows(w, rows)
		return
	}

	rows, err := db.DB.Query(query + " ORDER BY sort_order, title")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query quests")
		return
	}
	defer rows.Close()
	writeQuestRows(w, rows)
}

func writeQuestRows(w http.ResponseWriter, rows interface {
	Next() bool
	Scan(dest ...any) error
}) {
	quests := []types.Quest{}
	for rows.Next() {
		var q types.Quest
		if err := rows.Scan(&q.ID, &q.Title, &q.Description, &q.Status, &q.GameDateAdded, &q.GameDateCompleted, &q.Notes, &q.SortOrder, &q.CreatedAt, &q.UpdatedAt); err != nil {
			log.Printf("quest scan error: %v", err)
			continue
		}
		quests = append(quests, q)
	}
	writeJSON(w, http.StatusOK, quests)
}

func handleGetQuest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var q types.Quest
	err := db.DB.QueryRow("SELECT id, title, description, status, game_date_added, game_date_completed, notes, sort_order, created_at, updated_at FROM quests WHERE id = ?", id).
		Scan(&q.ID, &q.Title, &q.Description, &q.Status, &q.GameDateAdded, &q.GameDateCompleted, &q.Notes, &q.SortOrder, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "quest not found")
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func handleCreateQuest(w http.ResponseWriter, r *http.Request) {
	var q types.Quest
	if err := readJSON(r, &q); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	now := time.Now()
	q.CreatedAt = now
	q.UpdatedAt = now

	result, err := db.DB.Exec(
		"INSERT INTO quests (title, description, status, game_date_added, game_date_completed, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		q.Title, q.Description, q.Status, q.GameDateAdded, q.GameDateCompleted, q.Notes, q.SortOrder, q.CreatedAt, q.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create quest: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	q.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "quests", strconv.Itoa(q.ID), "create", "{}")
	}
	writeJSON(w, http.StatusCreated, q)
}

func handleUpdateQuest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var q types.Quest
	if err := readJSON(r, &q); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	q.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("quests", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE quests SET title=?, description=?, status=?, game_date_added=?, game_date_completed=?, notes=?, sort_order=?, updated_at=? WHERE id=?",
			q.Title, q.Description, q.Status, q.GameDateAdded, q.GameDateCompleted, q.Notes, q.SortOrder, q.UpdatedAt, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update quest")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "quest not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "quests", id, "update", diffJSON)
	}

	idInt, _ := strconv.Atoi(id)
	q.ID = idInt
	writeJSON(w, http.StatusOK, q)
}

func handleDeleteQuest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM quests WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete quest")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "quest not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "quests", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}
