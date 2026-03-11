package api

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

// gpToDenominations converts a GP float to integer gp, sp, cp values.
func gpToDenominations(gpFloat float64) (gp, sp, cp int) {
	totalCP := int(math.Round(gpFloat * 100))
	gp = totalCP / 100
	totalCP %= 100
	sp = totalCP / 10
	cp = totalCP % 10
	return
}

// itemColumns is the canonical column list for item queries.
// Keep in sync with scanItem.
const itemColumns = "id, name, quantity, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at, version"

// itemColumnsAliased is the same list prefixed with "i." for joins.
const itemColumnsAliased = "i.id, i.name, i.quantity, i.game_date, i.category, i.container_id, i.sold, i.unit_weight_lbs, i.unit_value_gp, i.weight_override, i.added_to_dndbeyond, i.identified, i.attuned_to, i.singular, i.notes, i.sort_order, i.created_at, i.updated_at, i.version"

// scanner is satisfied by both *sql.Row and *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

// scanItem scans a single item row into a types.Item.
func scanItem(s scanner) (types.Item, error) {
	var item types.Item
	err := s.Scan(
		&item.ID, &item.Name, &item.Quantity,
		&item.GameDate, &item.Category, &item.ContainerID, &item.Sold,
		&item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride,
		&item.AddedToDnDBeyond, &item.Identified, &item.AttunedTo,
		&item.Singular, &item.Notes, &item.SortOrder,
		&item.CreatedAt, &item.UpdatedAt, &item.Version,
	)
	return item, err
}

// scanItems scans all rows into a slice, logging (not swallowing) scan errors.
func scanItems(rows *sql.Rows) []types.Item {
	items := []types.Item{}
	for rows.Next() {
		item, err := scanItem(rows)
		if err != nil {
			log.Printf("item scan error: %v", err)
			continue
		}
		items = append(items, item)
	}
	return items
}

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
	query := "SELECT DISTINCT " + itemColumnsAliased + " FROM items i"

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

	items := scanItems(rows)
	loadItemLabels(items)
	writeJSON(w, http.StatusOK, items)
}

func handleGetItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	item, err := scanItem(db.DB.QueryRow("SELECT "+itemColumns+" FROM items WHERE id = ?", id))
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

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec(
		"INSERT INTO items (name, quantity, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, attuned_to, singular, notes, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM items), ?, ?)",
		item.Name, item.Quantity, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.AttunedTo, item.Singular, item.Notes, item.CreatedAt, item.UpdatedAt,
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

	if item.BuyPriceGP != nil && *item.BuyPriceGP > 0 {
		gp, sp, cp := gpToDenominations(*item.BuyPriceGP)
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, gp, direction, item_id, created_at) VALUES (?, ?, ?, ?, ?, 'out', ?, ?)",
			item.GameDate, fmt.Sprintf("Purchase: %s", item.Name), cp, sp, gp, item.ID, item.CreatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create coin ledger entry")
			return
		}
	}

	if len(item.LabelIDs) > 0 {
		if _, err := tx.Exec("DELETE FROM item_labels WHERE item_id = ?", item.ID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save labels")
			return
		}
		for _, lid := range item.LabelIDs {
			if _, err := tx.Exec("INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, ?)", item.ID, lid); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to save labels")
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit item creation")
		return
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
			"UPDATE items SET name=?, quantity=?, game_date=?, category=?, container_id=?, sold=?, unit_weight_lbs=?, unit_value_gp=?, weight_override=?, added_to_dndbeyond=?, identified=?, attuned_to=?, singular=?, notes=?, sort_order=?, updated_at=?, version=version+1 WHERE id=? AND version=?",
			item.Name, item.Quantity, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.AttunedTo, item.Singular, item.Notes, item.SortOrder, item.UpdatedAt, id, item.Version,
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

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	// Clean up linked coin_ledger entries before deleting the item
	idInt, _ := strconv.Atoi(id)
	tx.Exec("DELETE FROM coin_ledger WHERE item_id = ?", idInt)

	result, err := tx.Exec("DELETE FROM items WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit delete")
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

	var req struct {
		SellPriceGP *float64 `json:"sell_price_gp"`
		Quantity    *int     `json:"quantity"`
	}
	// Body is optional — ignore parse errors (empty body is fine)
	readJSON(r, &req)

	now := time.Now()

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	// Look up the current item
	var itemName, gameDate string
	var currentQty int
	if err := tx.QueryRow("SELECT name, game_date, quantity FROM items WHERE id = ?", id).Scan(&itemName, &gameDate, &currentQty); err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	sellQty := currentQty
	if req.Quantity != nil && *req.Quantity > 0 && *req.Quantity < currentQty {
		sellQty = *req.Quantity
	}

	if sellQty >= currentQty {
		// Sell all — mark as sold
		_, err = tx.Exec("UPDATE items SET sold = 1, updated_at = ? WHERE id = ?", now, id)
	} else {
		// Partial sell — reduce quantity on original item
		_, err = tx.Exec("UPDATE items SET quantity = quantity - ?, updated_at = ? WHERE id = ?", sellQty, now, id)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to sell item")
		return
	}

	if req.SellPriceGP != nil && *req.SellPriceGP > 0 {
		gp, sp, cp := gpToDenominations(*req.SellPriceGP)
		idInt, _ := strconv.Atoi(id)
		desc := fmt.Sprintf("Sale: %s", itemName)
		if sellQty < currentQty {
			desc = fmt.Sprintf("Sale: %s (x%d)", itemName, sellQty)
		}
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, gp, direction, item_id, created_at) VALUES (?, ?, ?, ?, ?, 'in', ?, ?)",
			gameDate, desc, cp, sp, gp, idInt, now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create coin ledger entry")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit sell")
		return
	}

	user := GetUser(r)
	if user != nil {
		if sellQty >= currentQty {
			LogChange(&user.ID, "items", id, "update", `{"sold":true}`)
		} else {
			LogChange(&user.ID, "items", id, "update", fmt.Sprintf(`{"quantity_sold":%d,"remaining":%d}`, sellQty, currentQty-sellQty))
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sold"})
}

func handleUnsellItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec("UPDATE items SET sold = 0, updated_at = ? WHERE id = ?", time.Now(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unsell item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	// Remove any coin_ledger 'in' entries linked to this item's sale
	idInt, _ := strconv.Atoi(id)
	tx.Exec("DELETE FROM coin_ledger WHERE item_id = ? AND direction = 'in' AND description LIKE 'Sale:%'", idInt)

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit unsell")
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
		Name  string `json:"name"`
		Magic *bool  `json:"magic"`
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
			"UPDATE items SET identified = 1, name = ?, updated_at = ? WHERE id = ?",
			req.Name, now, id,
		)
	} else {
		result, err = db.DB.Exec(
			"UPDATE items SET identified = 1, updated_at = ? WHERE id = ?",
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

	isMagic := req.Magic == nil || *req.Magic // default true for backward compat
	if isMagic {
		idInt, _ := strconv.Atoi(id)
		db.DB.Exec("INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, 'magic')", idInt)
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", fmt.Sprintf(`{"identified":true,"name":%q}`, req.Name))
	}

	// Return the updated item
	item, err := scanItem(db.DB.QueryRow("SELECT "+itemColumns+" FROM items WHERE id = ?", id))
	if err != nil {
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
		ItemIDs    []int    `json:"item_ids"`
		SellPriceGP *float64 `json:"sell_price_gp"`
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
	var itemNames []string
	for _, id := range req.ItemIDs {
		var itemName string
		if err := tx.QueryRow("SELECT name FROM items WHERE id = ?", id).Scan(&itemName); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to look up item")
			return
		}
		itemNames = append(itemNames, itemName)
		if _, err := tx.Exec("UPDATE items SET sold = 1, updated_at = ? WHERE id = ?", now, id); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to sell items")
			return
		}
	}

	if req.SellPriceGP != nil && *req.SellPriceGP > 0 {
		gp, sp, cp := gpToDenominations(*req.SellPriceGP)
		desc := fmt.Sprintf("Bulk sale: %d items", len(req.ItemIDs))
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, gp, direction, created_at) VALUES (?, ?, ?, ?, ?, 'in', ?)",
			"", desc, cp, sp, gp, now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create coin ledger entry")
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

func handleBulkLabelItems(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ItemIDs        []int    `json:"item_ids"`
		AddLabelIDs    []string `json:"add_label_ids"`
		RemoveLabelIDs []string `json:"remove_label_ids"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.ItemIDs) == 0 {
		writeError(w, http.StatusBadRequest, "item_ids required")
		return
	}
	if len(req.AddLabelIDs) == 0 && len(req.RemoveLabelIDs) == 0 {
		writeError(w, http.StatusBadRequest, "add_label_ids or remove_label_ids required")
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	for _, itemID := range req.ItemIDs {
		for _, lid := range req.RemoveLabelIDs {
			if _, err := tx.Exec("DELETE FROM item_labels WHERE item_id = ? AND label_id = ?", itemID, lid); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to remove labels")
				return
			}
		}
		for _, lid := range req.AddLabelIDs {
			if _, err := tx.Exec("INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, ?)", itemID, lid); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to add labels")
				return
			}
		}
	}

	now := time.Now()
	for _, itemID := range req.ItemIDs {
		if _, err := tx.Exec("UPDATE items SET updated_at = ? WHERE id = ?", now, itemID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update items")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit bulk label update")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", "bulk", "update", fmt.Sprintf(`{"add_labels":%q,"remove_labels":%q}`, req.AddLabelIDs, req.RemoveLabelIDs))
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func handleItemSummary(w http.ResponseWriter, r *http.Request) {
	var summary types.ItemSummary

	// Party coin from coin_ledger balance
	row := db.DB.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN direction='in' THEN cp ELSE -cp END), 0) * 0.01 +
			COALESCE(SUM(CASE WHEN direction='in' THEN sp ELSE -sp END), 0) * 0.1 +
			COALESCE(SUM(CASE WHEN direction='in' THEN ep ELSE -ep END), 0) * 0.5 +
			COALESCE(SUM(CASE WHEN direction='in' THEN gp ELSE -gp END), 0) +
			COALESCE(SUM(CASE WHEN direction='in' THEN pp ELSE -pp END), 0) * 10
		FROM coin_ledger
	`)
	if err := row.Scan(&summary.PartyCoinGP); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query party coin total")
		return
	}

	// Net worth = party coin + value of unsold items
	var itemValueGP float64
	if err := db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(unit_value_gp,0) * quantity), 0) FROM items WHERE sold = 0").Scan(&itemValueGP); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query item value")
		return
	}
	summary.NetWorthGP = summary.PartyCoinGP + itemValueGP

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
