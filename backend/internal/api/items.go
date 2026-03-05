package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListItems(w http.ResponseWriter, r *http.Request) {
	query := "SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, singular, notes, created_at, updated_at FROM items"

	var args []any
	var conditions []string

	if cat := r.URL.Query().Get("category"); cat != "" {
		conditions = append(conditions, "category = ?")
		args = append(args, cat)
	}
	if sold := r.URL.Query().Get("sold"); sold != "" {
		conditions = append(conditions, "sold = ?")
		if sold == "true" {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	if cid := r.URL.Query().Get("container_id"); cid != "" {
		conditions = append(conditions, "container_id = ?")
		args = append(args, cid)
	}

	if len(conditions) > 0 {
		query += " WHERE "
		for i, c := range conditions {
			if i > 0 {
				query += " AND "
			}
			query += c
		}
	}
	query += " ORDER BY game_date DESC, name"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query items")
		return
	}
	defer rows.Close()

	items := []types.Item{}
	for rows.Next() {
		var item types.Item
		rows.Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.Singular, &item.Notes, &item.CreatedAt, &item.UpdatedAt)
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, items)
}

func handleGetItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var item types.Item
	err := db.DB.QueryRow("SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, singular, notes, created_at, updated_at FROM items WHERE id = ?", id).
		Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.Singular, &item.Notes, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func handleCreateItem(w http.ResponseWriter, r *http.Request) {
	var item types.Item
	if err := readJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	now := time.Now()
	item.CreatedAt = now
	item.UpdatedAt = now

	result, err := db.DB.Exec(
		"INSERT INTO items (name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, singular, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		item.Name, item.Quantity, item.CreditGP, item.DebitGP, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.Singular, item.Notes, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create item: %v", err))
		return
	}

	id, _ := result.LastInsertId()
	item.ID = int(id)

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

	item.UpdatedAt = time.Now()
	result, err := db.DB.Exec(
		"UPDATE items SET name=?, quantity=?, credit_gp=?, debit_gp=?, game_date=?, category=?, container_id=?, sold=?, unit_weight_lbs=?, unit_value_gp=?, weight_override=?, added_to_dndbeyond=?, identified=?, singular=?, notes=?, updated_at=? WHERE id=?",
		item.Name, item.Quantity, item.CreditGP, item.DebitGP, item.GameDate, item.Category, item.ContainerID, item.Sold, item.UnitWeightLbs, item.UnitValueGP, item.WeightOverride, item.AddedToDnDBeyond, item.Identified, item.Singular, item.Notes, item.UpdatedAt, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update item")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "item not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", "{}")
	}

	idInt, _ := strconv.Atoi(id)
	item.ID = idInt
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

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "items", id, "update", fmt.Sprintf(`{"identified":true,"name":%q}`, req.Name))
	}

	// Return the updated item
	var item types.Item
	db.DB.QueryRow("SELECT id, name, quantity, credit_gp, debit_gp, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, weight_override, added_to_dndbeyond, identified, singular, notes, created_at, updated_at FROM items WHERE id = ?", id).
		Scan(&item.ID, &item.Name, &item.Quantity, &item.CreditGP, &item.DebitGP, &item.GameDate, &item.Category, &item.ContainerID, &item.Sold, &item.UnitWeightLbs, &item.UnitValueGP, &item.WeightOverride, &item.AddedToDnDBeyond, &item.Identified, &item.Singular, &item.Notes, &item.CreatedAt, &item.UpdatedAt)

	writeJSON(w, http.StatusOK, item)
}

func handleItemSummary(w http.ResponseWriter, r *http.Request) {
	var summary types.ItemSummary

	db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(credit_gp,0)) - SUM(COALESCE(debit_gp,0)), 0) FROM items WHERE sold = 0").Scan(&summary.PartyCoinGP)

	db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(credit_gp,0)) - SUM(COALESCE(debit_gp,0)), 0) + COALESCE(SUM(COALESCE(unit_value_gp,0) * quantity), 0) FROM items WHERE sold = 0").Scan(&summary.NetWorthGP)

	db.DB.QueryRow("SELECT COALESCE(SUM(COALESCE(weight_override, COALESCE(unit_weight_lbs,0) * quantity)), 0) FROM items WHERE sold = 0").Scan(&summary.TotalWeight)

	db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE sold = 0").Scan(&summary.ItemCount)

	writeJSON(w, http.StatusOK, summary)
}
