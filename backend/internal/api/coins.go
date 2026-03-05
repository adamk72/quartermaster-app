package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListCoins(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, game_date, description, cp, sp, ep, gp, pp, direction, item_id, notes, created_at FROM coin_ledger ORDER BY created_at DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query coins")
		return
	}
	defer rows.Close()

	entries := []types.CoinLedgerEntry{}
	for rows.Next() {
		var e types.CoinLedgerEntry
		rows.Scan(&e.ID, &e.GameDate, &e.Description, &e.CP, &e.SP, &e.EP, &e.GP, &e.PP, &e.Direction, &e.ItemID, &e.Notes, &e.CreatedAt)
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}

func handleCreateCoin(w http.ResponseWriter, r *http.Request) {
	var e types.CoinLedgerEntry
	if err := readJSON(r, &e); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.CreatedAt = time.Now()

	result, err := db.DB.Exec(
		"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, item_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		e.GameDate, e.Description, e.CP, e.SP, e.EP, e.GP, e.PP, e.Direction, e.ItemID, e.Notes, e.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create coin entry: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	e.ID = int(id)

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "coin_ledger", strconv.Itoa(e.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, e)
}

func handleDeleteCoin(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM coin_ledger WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete coin entry")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "coin entry not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "coin_ledger", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

func handleCoinBalance(w http.ResponseWriter, r *http.Request) {
	var balance types.CoinBalance

	row := db.DB.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN direction='in' THEN cp ELSE -cp END), 0),
			COALESCE(SUM(CASE WHEN direction='in' THEN sp ELSE -sp END), 0),
			COALESCE(SUM(CASE WHEN direction='in' THEN ep ELSE -ep END), 0),
			COALESCE(SUM(CASE WHEN direction='in' THEN gp ELSE -gp END), 0),
			COALESCE(SUM(CASE WHEN direction='in' THEN pp ELSE -pp END), 0)
		FROM coin_ledger
	`)
	row.Scan(&balance.CP, &balance.SP, &balance.EP, &balance.GP, &balance.PP)

	balance.TotalGP = float64(balance.CP)*0.01 + float64(balance.SP)*0.1 + float64(balance.EP)*0.5 + float64(balance.GP) + float64(balance.PP)*10

	writeJSON(w, http.StatusOK, balance)
}
