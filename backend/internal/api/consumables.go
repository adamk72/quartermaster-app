package api

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

// --- Consumable Types ---

func handleListConsumableTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, unit, per_person_per_day, sort_order FROM consumable_types ORDER BY sort_order, name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query consumable types")
		return
	}
	defer rows.Close()

	ctypes := []types.ConsumableType{}
	for rows.Next() {
		var ct types.ConsumableType
		if err := rows.Scan(&ct.ID, &ct.Name, &ct.Unit, &ct.PerPersonPerDay, &ct.SortOrder); err != nil {
			continue
		}
		ctypes = append(ctypes, ct)
	}
	writeJSON(w, http.StatusOK, ctypes)
}

func handleCreateConsumableType(w http.ResponseWriter, r *http.Request) {
	var ct types.ConsumableType
	if err := readJSON(r, &ct); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if ct.ID == "" || ct.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name required")
		return
	}
	if ct.PerPersonPerDay == 0 {
		ct.PerPersonPerDay = 1
	}
	if ct.Unit == "" {
		ct.Unit = "units"
	}

	_, err := db.DB.Exec(
		"INSERT INTO consumable_types (id, name, unit, per_person_per_day, sort_order) VALUES (?, ?, ?, ?, ?)",
		ct.ID, ct.Name, ct.Unit, ct.PerPersonPerDay, ct.SortOrder,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create consumable type: %v", err))
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_types", ct.ID, "create", "{}")
	}

	writeJSON(w, http.StatusCreated, ct)
}

func handleUpdateConsumableType(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var ct types.ConsumableType
	if err := readJSON(r, &ct); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	diffJSON, n, err := diffUpdate("consumable_types", id, func(tx *sql.Tx) (sql.Result, error) {
		return tx.Exec(
			"UPDATE consumable_types SET name=?, unit=?, per_person_per_day=?, sort_order=? WHERE id=?",
			ct.Name, ct.Unit, ct.PerPersonPerDay, ct.SortOrder, id,
		)
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update consumable type")
		return
	}
	if n == 0 {
		writeError(w, http.StatusNotFound, "consumable type not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_types", id, "update", diffJSON)
	}

	ct.ID = id
	writeJSON(w, http.StatusOK, ct)
}

func handleDeleteConsumableType(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM consumable_types WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete consumable type")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "consumable type not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_types", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Consumable Ledger ---

func handleListConsumableLedger(w http.ResponseWriter, r *http.Request) {
	query := "SELECT id, consumable_type_id, quantity, direction, game_date, description, head_count, notes, created_at FROM consumable_ledger"
	var args []any

	if typeID := r.URL.Query().Get("type"); typeID != "" {
		query += " WHERE consumable_type_id = ?"
		args = append(args, typeID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query consumable ledger")
		return
	}
	defer rows.Close()

	entries := []types.ConsumableLedgerEntry{}
	for rows.Next() {
		var e types.ConsumableLedgerEntry
		if err := rows.Scan(&e.ID, &e.ConsumableTypeID, &e.Quantity, &e.Direction, &e.GameDate, &e.Description, &e.HeadCount, &e.Notes, &e.CreatedAt); err != nil {
			continue
		}
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}

func handleCreateConsumableLedgerEntry(w http.ResponseWriter, r *http.Request) {
	var e types.ConsumableLedgerEntry
	if err := readJSON(r, &e); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.CreatedAt = time.Now()

	result, err := db.DB.Exec(
		"INSERT INTO consumable_ledger (consumable_type_id, quantity, direction, game_date, description, head_count, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		e.ConsumableTypeID, e.Quantity, e.Direction, e.GameDate, e.Description, e.HeadCount, e.Notes, e.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create entry: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	e.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_ledger", strconv.Itoa(e.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, e)
}

func handleDeleteConsumableLedgerEntry(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM consumable_ledger WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete entry")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "entry not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_ledger", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Balances ---

func handleConsumableBalances(w http.ResponseWriter, r *http.Request) {
	// Count active party members
	var activeCount int
	if err := db.DB.QueryRow("SELECT COUNT(*) FROM characters").Scan(&activeCount); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count characters")
		return
	}
	if activeCount == 0 {
		activeCount = 1
	}

	rows, err := db.DB.Query(`
		SELECT
			ct.id, ct.name, ct.unit, ct.per_person_per_day,
			COALESCE(SUM(CASE WHEN cl.direction='in' THEN cl.quantity ELSE -cl.quantity END), 0) as balance
		FROM consumable_types ct
		LEFT JOIN consumable_ledger cl ON cl.consumable_type_id = ct.id
		GROUP BY ct.id, ct.name, ct.unit, ct.per_person_per_day
		ORDER BY ct.sort_order, ct.name
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query balances")
		return
	}
	defer rows.Close()

	balances := []types.ConsumableBalance{}
	for rows.Next() {
		var b types.ConsumableBalance
		if err := rows.Scan(&b.ConsumableTypeID, &b.Name, &b.Unit, &b.PerPersonPerDay, &b.Balance); err != nil {
			continue
		}
		if b.PerPersonPerDay > 0 && activeCount > 0 {
			dailyUsage := b.PerPersonPerDay * float64(activeCount)
			if dailyUsage > 0 {
				b.DaysRemaining = b.Balance / dailyUsage
			}
		}
		balances = append(balances, b)
	}
	writeJSON(w, http.StatusOK, balances)
}

// --- Consume Day ---

func handleConsumeDay(w http.ResponseWriter, r *http.Request) {
	var req types.ConsumeDayRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.HeadCount <= 0 {
		// Default to number of characters
		if err := db.DB.QueryRow("SELECT COUNT(*) FROM characters").Scan(&req.HeadCount); err != nil || req.HeadCount <= 0 {
			writeError(w, http.StatusBadRequest, "head_count required (no characters found)")
			return
		}
	}

	// Deduct each consumable type by per_person_per_day * head_count
	typeRows, err := db.DB.Query("SELECT id, name, per_person_per_day FROM consumable_types ORDER BY sort_order")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query consumable types")
		return
	}
	defer typeRows.Close()

	now := time.Now()
	var results []types.ConsumableLedgerEntry

	for typeRows.Next() {
		var id, name string
		var perPerson float64
		if err := typeRows.Scan(&id, &name, &perPerson); err != nil {
			continue
		}

		qty := perPerson * float64(req.HeadCount)
		if qty <= 0 {
			continue
		}

		desc := fmt.Sprintf("1 day x %d people", req.HeadCount)
		result, err := db.DB.Exec(
			"INSERT INTO consumable_ledger (consumable_type_id, quantity, direction, game_date, description, head_count, notes, created_at) VALUES (?, ?, 'out', ?, ?, ?, ?, ?)",
			id, qty, req.GameDate, desc, req.HeadCount, req.Notes, now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to deduct %s: %v", name, err))
			return
		}

		entryID, _ := result.LastInsertId()
		results = append(results, types.ConsumableLedgerEntry{
			ID:               int(entryID),
			ConsumableTypeID: id,
			Quantity:         qty,
			Direction:        "out",
			GameDate:         req.GameDate,
			Description:      desc,
			HeadCount:        &req.HeadCount,
			Notes:            req.Notes,
			CreatedAt:        now,
		})
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "consumable_ledger", "consume-day", "create", fmt.Sprintf(`{"head_count":%d}`, req.HeadCount))
	}

	writeJSON(w, http.StatusCreated, results)
}
