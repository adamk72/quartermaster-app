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

func handleListLabels(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, color, sort_order, created_at, updated_at FROM labels ORDER BY sort_order, name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query labels")
		return
	}
	defer rows.Close()

	labels := []types.Label{}
	for rows.Next() {
		var l types.Label
		if err := rows.Scan(&l.ID, &l.Name, &l.Color, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt); err != nil {
			log.Printf("label scan error: %v", err)
			continue
		}
		labels = append(labels, l)
	}
	writeJSON(w, http.StatusOK, labels)
}

func handleCreateLabel(w http.ResponseWriter, r *http.Request) {
	var label types.Label
	if err := readJSON(r, &label); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if label.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if label.ID == "" {
		label.ID = slugify(label.Name)
	}
	if label.Color == "" {
		label.Color = "#7d7568"
	}

	now := time.Now()
	label.CreatedAt = now
	label.UpdatedAt = now

	_, err := db.DB.Exec(
		"INSERT INTO labels (id, name, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM labels), ?, ?)",
		label.ID, label.Name, label.Color, label.CreatedAt, label.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeError(w, http.StatusConflict, "a label with that name already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create label: %v", err))
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "labels", label.ID, "create", "{}")
	}

	writeJSON(w, http.StatusCreated, label)
}

func handleUpdateLabel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var label types.Label
	if err := readJSON(r, &label); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if label.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	label.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("labels", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE labels SET name=?, color=?, sort_order=?, updated_at=? WHERE id=?",
			label.Name, label.Color, label.SortOrder, label.UpdatedAt, id,
		)
	})
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			writeError(w, http.StatusConflict, "a label with that name already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update label")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "label not found")
		return
	}

	// Re-read to return full row (including created_at)
	err = db.DB.QueryRow("SELECT created_at FROM labels WHERE id = ?", id).Scan(&label.CreatedAt)
	if err != nil {
		label.CreatedAt = time.Time{} // fallback
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "labels", id, "update", diffJSON)
	}

	label.ID = id
	writeJSON(w, http.StatusOK, label)
}

func handleDeleteLabel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM labels WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete label")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "label not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "labels", id, "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}

// loadItemLabels batch-loads labels for a slice of items.
func loadItemLabels(items []types.Item) {
	if len(items) == 0 {
		return
	}
	ids := make([]any, len(items))
	placeholders := make([]string, len(items))
	idxMap := make(map[int]int, len(items)) // item.ID -> index
	for i, item := range items {
		ids[i] = item.ID
		placeholders[i] = "?"
		idxMap[item.ID] = i
		items[i].Labels = []types.Label{} // ensure non-nil
	}

	query := fmt.Sprintf(
		"SELECT il.item_id, l.id, l.name, l.color, l.sort_order FROM item_labels il JOIN labels l ON l.id = il.label_id WHERE il.item_id IN (%s) ORDER BY l.sort_order, l.name",
		strings.Join(placeholders, ","),
	)
	rows, err := db.DB.Query(query, ids...)
	if err != nil {
		log.Printf("loadItemLabels: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var itemID int
		var l types.Label
		if err := rows.Scan(&itemID, &l.ID, &l.Name, &l.Color, &l.SortOrder); err != nil {
			log.Printf("item-label scan error: %v", err)
			continue
		}
		if idx, ok := idxMap[itemID]; ok {
			items[idx].Labels = append(items[idx].Labels, l)
		}
	}
}

// saveItemLabels replaces labels for an item.
func saveItemLabels(itemID int, labelIDs []string) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM item_labels WHERE item_id = ?", itemID); err != nil {
		return err
	}
	for _, lid := range labelIDs {
		if _, err := tx.Exec("INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, ?)", itemID, lid); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " & ", "-")
	s = strings.ReplaceAll(s, " ", "-")
	// Remove non-alphanumeric/dash
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
