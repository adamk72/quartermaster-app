package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)


const maxAttunementSlots = 3

// validateAttunement checks that the character exists, hasn't exceeded the attunement limit,
// and that the item is in a 'character'-type container owned by that character (on their person).
// excludeItemID is the item being updated (0 for new items) so it isn't counted against the limit.
func validateAttunement(charID string, containerID *string, excludeItemID int) error {
	var exists bool
	if err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM characters WHERE id = ?)", charID).Scan(&exists); err != nil || !exists {
		return fmt.Errorf("character %q not found", charID)
	}

	// Item must be in a character-type container owned by the attuning character
	if containerID == nil || *containerID == "" {
		return fmt.Errorf("item must be in a container owned by %q to attune", charID)
	}
	var cType string
	var cCharID *string
	err := db.DB.QueryRow("SELECT type, character_id FROM containers WHERE id = ?", *containerID).Scan(&cType, &cCharID)
	if err != nil {
		return fmt.Errorf("container not found")
	}
	if cType != "character" {
		return fmt.Errorf("item must be on the character's person to attune (not in a %s)", cType)
	}
	if cCharID == nil || *cCharID != charID {
		return fmt.Errorf("item must be in a container owned by the attuning character")
	}

	var count int
	query := "SELECT COUNT(*) FROM items WHERE attuned_to = ? AND id != ?"
	if err := db.DB.QueryRow(query, charID, excludeItemID).Scan(&count); err != nil {
		return fmt.Errorf("failed to check attunement count")
	}
	if count >= maxAttunementSlots {
		return fmt.Errorf("character already has %d attuned items (max %d)", count, maxAttunementSlots)
	}
	return nil
}

func handleListItems(w http.ResponseWriter, r *http.Request) {
	query := "SELECT DISTINCT i.id, i.name, i.quantity, i.credit_gp, i.debit_gp, i.game_date, i.category, i.container_id, i.sold, i.unit_weight_lbs, i.unit_value_gp, i.weight_override, i.added_to_dndbeyond, i.identified, i.attuned_to, i.singular, i.notes, i.sort_order, i.created_at, i.updated_at, i.version FROM items i"

	var args []any
	var conditions []string
	var joins []string

	if label := r.URL.Query().Get("label"); label != "" {
		joins = append(joins, "JOIN item_labels il ON il.item_id = i.id")
		conditions = append(conditions, "il.label_id = ?")
		args = append(args, label)
	} else if cat := r.URL.Query().Get("category"); cat != "" {
		conditions = append(conditions, "i.category = ?")
		args = append(args, cat)
	}
	if sold := r.URL.Query().Get("sold"); sold != "" {
		conditions = append(conditions, "i.sold = ?")
		if sold == "true" {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	if cid := r.URL.Query().Get("container_id"); cid != "" {
		conditions = append(conditions, "i.container_id = ?")
		args = append(args, cid)
	}

	for _, j := range joins {
		query += " " + j
	}
	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY i.sort_order, i.name"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query items")
		return
	}
	defer rows.Close()

	items := []types.Item{}
	for rows.Next() {
		var item types.Item
		if err := rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.AttunedTo, &item.Singular, &item.Notes, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt, &item.Version); err != nil {
			continue
		}
		items = append(items, item)
	}
	loadItemLabels(items)
	writeJSON(w, http.StatusOK, items)
}

func handleGetItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var item types.Item
	err := db.DB.QueryRow("SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at, version FROM items WHERE id = ?", id).
		Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.AttunedTo, &item.Singular, &item.Notes, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt, &item.Version)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	singleItems := []types.Item{item}
	loadItemLabels(singleItems)
	writeJSON(w, http.StatusOK, singleItems[0])
}

func handleCreateItem(w http.ResponseWriter, r *http.Request) {
	var item types.Item
	if err := readJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if item.AttunedTo != nil && *item.AttunedTo != "" {
		if err := validateAttunement(*item.AttunedTo, item.ContainerID, 0); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now

	result, err := db.DB.Exec(
		"INSERT INTO items (name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM items), ?, ?)",
		item.Name, item.Quantity, item.CreditGP, item.DebitGP, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.AttunedTo, item.Singular, item.Notes, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "FOREIGN KEY constraint failed") {
			writeError(w, http.StatusBadRequest, "invalid reference: check container_id and attuned_to values")
			return
		}
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create item: %v", err))
		return
	}

	id, _ := result.LastInsertId()
	item.ID = int(id)

	if len(item.LabelIDs) > 0 {
		if err := saveItemLabels(item.ID, item.LabelIDs); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save labels")
			return
		}
	}

	singleItems := []types.Item{item}
	loadItemLabels(singleItems)
	item = singleItems[0]

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", strconv.Itoa(item.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, item)
}

func handleUpdateItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var item types.Item
	if err := readJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if item.AttunedTo != nil && *item.AttunedTo != "" {
		idInt, _ := strconv.Atoi(id)
		if err := validateAttunement(*item.AttunedTo, item.ContainerID, idInt); err != nil {
			// Clear invalid attunement (e.g. legacy data from before container rule)
			item.AttunedTo = nil
		}
	}

	item.UpdatedAt = time.Now()
	diffJSON, n, err := diffUpdate("items", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE items SET name=?, quantity=?, credit_gp=?, debit_gp=?, game_date=?, category=?, container_id=?, sold=?, unit_weight_lbs=?, unit_value_gp=?, weight_override=?, added_to_dndbeyond=?, identified=?, attuned_to=?, singular=?, notes=?, sort_order=?, updated_at=?, version=version+1 WHERE id=? AND version=?",
			item.Name, item.Quantity, item.CreditGP, item.DebitGP, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.AttunedTo, item.Singular, item.Notes, item.SortOrder, item.UpdatedAt, id, item.Version,
		)
	})
	if err != nil {
		if strings.Contains(err.Error(), "FOREIGN KEY constraint failed") {
			writeError(w, http.StatusBadRequest, "invalid reference: check container_id and attuned_to values")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update item")
		return
	}
	if checkVersionConflict(w, "items", id, n, "item") {
		return
	}
	item.Version++ // reflect the incremented version in the response

	idInt, _ := strconv.Atoi(id)
	item.ID = idInt

	if item.LabelIDs != nil {
		if err := saveItemLabels(item.ID, item.LabelIDs); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save labels")
			return
		}
	}

	singleItems := []types.Item{item}
	loadItemLabels(singleItems)
	item = singleItems[0]

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", diffJSON)
	}

	writeJSON(w, http.StatusOK, item)
}

func handleDeleteItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM items WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleSellItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("UPDATE items SET sold = 1, updated_at = ? WHERE id = ?", time.Now(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to sell item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", `{"sold":true}`)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sold"})
}

func handleUnsellItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("UPDATE items SET sold = 0, updated_at = ? WHERE id = ?", time.Now(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unsell item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", `{"sold":false}`)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "unsold"})
}

func handleIdentifyItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req struct {
		Name string `json:"name"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	now := time.Now()
	var result sql.Result
	var err error

	if req.Name != "" {
		result, err = db.DB.Exec(
			"UPDATE items SET identified = 1, name = ?, category = 'Magic', updated_at = ? WHERE id = ?",
			req.Name, now, id,
		)
	} else {
		result, err = db.DB.Exec(
			"UPDATE items SET identified = 1, category = 'Magic', updated_at = ? WHERE id = ?",
			now, id,
		)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to identify item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	// Add 'magic' label if not already present.
	// NOTE: This assumes the seeded 'magic' label exists. If it has been deleted
	// via Settings, this INSERT silently does nothing (OR IGNORE + FK constraint).
	// A future improvement could prevent deletion of built-in labels.
	idInt, _ := strconv.Atoi(id)
	db.DB.Exec("INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, 'magic')", idInt)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", fmt.Sprintf(`{"identified":true,"name":%q}`, req.Name))
	}

	// Return the updated item
	var item types.Item
	if err := db.DB.QueryRow("SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at, version FROM items WHERE id = ?", id).
		Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.AttunedTo, &item.Singular, &item.Notes, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt, &item.Version); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reload identified item")
		return
	}

	singleItems := []types.Item{item}
	loadItemLabels(singleItems)
	writeJSON(w, http.StatusOK, singleItems[0])
}

func handleReorderItems(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ItemIDs []int `json:"item_ids"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "item_ids required")
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	for i, id := range req.ItemIDs {
		if _, err := tx.Exec("UPDATE items SET sort_order = ? WHERE id = ?", i, id); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update sort order")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit reorder")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", "bulk", "reorder", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleBulkSellItems(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ItemIDs []int `json:"item_ids"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "item_ids required")
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	now := time.Now()
	for _, id := range req.ItemIDs {
		if _, err := tx.Exec("UPDATE items SET sold = 1, updated_at = ? WHERE id = ?", now, id); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to sell items")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit bulk sell")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", "bulk", "update", `{"sold":true}`)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sold"})
}

func handleBulkDeleteItems(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ItemIDs []int `json:"item_ids"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "item_ids required")
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	for _, id := range req.ItemIDs {
		if _, err := tx.Exec("DELETE FROM items WHERE id = ?", id); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to delete items")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit bulk delete")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", "bulk", "delete", "{}")
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleBulkMoveItems(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ItemIDs     []int  `json:"item_ids"`
		ContainerID string `json:"container_id"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "item_ids required")
		return
	}

	// Validate container exists (empty string means unassign)
	var containerID *string
	var destCharacterID *string
	if req.ContainerID != "" {
		var exists bool
		if err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM containers WHERE id = ?)", req.ContainerID).Scan(&exists); err != nil || !exists {
			writeError(w, http.StatusBadRequest, "container not found")
			return
		}
		containerID = &req.ContainerID
		// Look up the destination container's owner for attunement preservation
		var charID *string
		db.DB.QueryRow("SELECT character_id FROM containers WHERE id = ?", req.ContainerID).Scan(&charID)
		destCharacterID = charID
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	now := time.Now()
	for _, id := range req.ItemIDs {
		// Clear attunement only if the item is attuned to a different character than the destination container's owner
		if destCharacterID != nil {
			if _, err := tx.Exec("UPDATE items SET container_id = ?, attuned_to = CASE WHEN attuned_to = ? THEN attuned_to ELSE NULL END, updated_at = ? WHERE id = ?", containerID, *destCharacterID, now, id); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to move items")
				return
			}
		} else {
			if _, err := tx.Exec("UPDATE items SET container_id = ?, attuned_to = NULL, updated_at = ? WHERE id = ?", containerID, now, id); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to move items")
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit bulk move")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", "bulk", "update", fmt.Sprintf(`{"container_id":%q}`, req.ContainerID))
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "moved"})
}

func handleItemSummary(w http.ResponseWriter, r *http.Request) {
	var summary types.ItemSummary

	if err := db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(credit_gp,0)) - SUM(COALESCE(debit_gp,0)), 0) FROM items WHERE sold = 0").Scan(&summary.PartyCoinGP); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query party coin total")
		return
	}

	if err := db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(credit_gp,0)) - SUM(COALESCE(debit_gp,0)), 0) + COALESCE(SUM(COALESCE(unit_value_gp,0) * quantity), 0) FROM items WHERE sold = 0").Scan(&summary.NetWorthGP); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query net worth")
		return
	}

	if err := db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(weight_override, COALESCE(unit_weight_lbs,0) * quantity)), 0) FROM items WHERE sold = 0").Scan(&summary.TotalWeight); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query total weight")
		return
	}

	if err := db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE sold = 0").Scan(&summary.ItemCount); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query item count")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}
