package api

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
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
		if err := rows.Scan(&e.ID, &e.GameDate, &e.Description, &e.CP, &e.SP, &e.EP, &e.GP, &e.PP, &e.Direction, &e.ItemID, &e.Notes, &e.CreatedAt); err != nil {
			log.Printf("coin ledger scan error: %v", err)
			continue
		}
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

func handleLootSplit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GameDate     string   `json:"game_date"`
		Description  string   `json:"description"`
		CP           int      `json:"cp"`
		SP           int      `json:"sp"`
		EP           int      `json:"ep"`
		GP           int      `json:"gp"`
		PP           int      `json:"pp"`
		CharacterIDs []string `json:"character_ids"`
		FromBalance  bool     `json:"from_balance"`
		ConvertToGP  bool     `json:"convert_to_gp"`
		ReserveGP    int      `json:"reserve_gp"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.CharacterIDs) == 0 {
		writeError(w, http.StatusBadRequest, "character_ids required")
		return
	}

	n := len(req.CharacterIDs)

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	now := time.Now()
	desc := req.Description
	if desc == "" {
		desc = "Loot split"
	}

	// Determine what gets split
	var splitCP, splitSP, splitEP, splitGP, splitPP int
	if req.ConvertToGP {
		// Convert all denominations to CP, then to whole GP
		// Rates: 1pp=1000cp, 1gp=100cp, 1ep=50cp, 1sp=10cp, 1cp=1cp
		totalCP := req.CP + req.SP*10 + req.EP*50 + req.GP*100 + req.PP*1000
		totalGP := totalCP / 100
		leftoverCP := totalCP % 100

		// Withdraw all original denominations
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'out', ?, ?)",
			req.GameDate, desc+" (converted for split)", req.CP, req.SP, req.EP, req.GP, req.PP, "", now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create withdrawal entry")
			return
		}

		// Put back sub-GP change that can't convert
		if leftoverCP > 0 {
			remSP := leftoverCP / 10
			remCP := leftoverCP % 10
			_, err := tx.Exec(
				"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?)",
				req.GameDate, desc+" (change — party treasure)", remCP, remSP, 0, 0, 0, "", now,
			)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create change entry")
				return
			}
		}

		// Reserve GP stays in party treasury
		splitGP = totalGP - req.ReserveGP
		if splitGP < 0 {
			splitGP = 0
		}
		if req.ReserveGP > 0 && req.ReserveGP <= totalGP {
			_, err := tx.Exec(
				"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?)",
				req.GameDate, desc+" (party reserve)", 0, 0, 0, req.ReserveGP, 0, "", now,
			)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create reserve entry")
				return
			}
		}

		splitCP, splitSP, splitEP, splitPP = 0, 0, 0, 0
	} else {
		splitCP, splitSP, splitEP, splitGP, splitPP = req.CP, req.SP, req.EP, req.GP, req.PP

		// When splitting from existing balance, withdraw the total first
		if req.FromBalance {
			_, err := tx.Exec(
				"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'out', ?, ?)",
				req.GameDate, desc+" (withdrawn for split)", req.CP, req.SP, req.EP, req.GP, req.PP, "", now,
			)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create withdrawal entry")
				return
			}
		}
	}

	// Calculate per-person and remainder
	perCP, remCP := splitCP/n, splitCP%n
	perSP, remSP := splitSP/n, splitSP%n
	perEP, remEP := splitEP/n, splitEP%n
	perGP, remGP := splitGP/n, splitGP%n
	perPP, remPP := splitPP/n, splitPP%n

	for _, charID := range req.CharacterIDs {
		if perCP == 0 && perSP == 0 && perEP == 0 && perGP == 0 && perPP == 0 {
			continue
		}
		entryDesc := fmt.Sprintf("%s (%s)", desc, charID)
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?)",
			req.GameDate, entryDesc, perCP, perSP, perEP, perGP, perPP, "", now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create coin entry")
			return
		}
	}

	// Remainder stays in party treasure
	if remCP > 0 || remSP > 0 || remEP > 0 || remGP > 0 || remPP > 0 {
		_, err := tx.Exec(
			"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?)",
			req.GameDate, desc+" (remainder — party treasure)", remCP, remSP, remEP, remGP, remPP, "", now,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create remainder entry")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit loot split")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "coin_ledger", "bulk", "create", fmt.Sprintf(`{"split":%d}`, n))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":     "split",
		"num_shares": n,
		"per_share":  map[string]int{"cp": perCP, "sp": perSP, "ep": perEP, "gp": perGP, "pp": perPP},
		"remainder":  map[string]int{"cp": remCP, "sp": remSP, "ep": remEP, "gp": remGP, "pp": remPP},
	})
}

func handleCoinConvert(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FromDenom string `json:"from_denom"`
		ToDenom   string `json:"to_denom"`
		Amount    int    `json:"amount"`
		GameDate  string `json:"game_date"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Amount <= 0 || req.FromDenom == req.ToDenom {
		writeError(w, http.StatusBadRequest, "invalid conversion")
		return
	}

	toCp := map[string]int{"cp": 1, "sp": 10, "ep": 50, "gp": 100, "pp": 1000}
	fromRate, fromOK := toCp[req.FromDenom]
	toRate, toOK := toCp[req.ToDenom]
	if !fromOK || !toOK {
		writeError(w, http.StatusBadRequest, "invalid denomination")
		return
	}
	converted := (req.Amount * fromRate) / toRate

	desc := fmt.Sprintf("Convert %d %s → %d %s", req.Amount, req.FromDenom, converted, req.ToDenom)
	denomZero := map[string]int{"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback()

	now := time.Now()

	outAmounts := denomZero
	outAmounts[req.FromDenom] = req.Amount
	_, err = tx.Exec(
		"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'out', ?, ?)",
		req.GameDate, desc, outAmounts["cp"], outAmounts["sp"], outAmounts["ep"], outAmounts["gp"], outAmounts["pp"], "", now,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create conversion out entry")
		return
	}

	inAmounts := map[string]int{"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}
	inAmounts[req.ToDenom] = converted
	_, err = tx.Exec(
		"INSERT INTO coin_ledger (game_date, description, cp, sp, ep, gp, pp, direction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'in', ?, ?)",
		req.GameDate, desc, inAmounts["cp"], inAmounts["sp"], inAmounts["ep"], inAmounts["gp"], inAmounts["pp"], "", now,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create conversion in entry")
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit conversion")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "coin_ledger", "convert", "create", desc)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"from_denom": req.FromDenom, "to_denom": req.ToDenom,
		"amount": req.Amount, "converted": converted,
	})
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
	if err := row.Scan(&balance.CP, &balance.SP, &balance.EP, &balance.GP, &balance.PP); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query coin balance")
		return
	}

	balance.TotalGP = float64(balance.CP)*0.01 + float64(balance.SP)*0.1 + float64(balance.EP)*0.5 + float64(balance.GP) + float64(balance.PP)*10

	writeJSON(w, http.StatusOK, balance)
}
