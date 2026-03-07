package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

// GetSetting reads a single setting value from the database.
func GetSetting(key string) (string, error) {
	var value string
	err := db.DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err != nil {
		return "", fmt.Errorf("setting %q not found", key)
	}
	return value, nil
}

func handleListSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT key, value, updated_at FROM settings ORDER BY key")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query settings")
		return
	}
	defer rows.Close()

	settings := []types.Setting{}
	for rows.Next() {
		var s types.Setting
		if err := rows.Scan(&s.Key, &s.Value, &s.UpdatedAt); err != nil {
			log.Printf("settings scan error: %v", err)
			continue
		}
		settings = append(settings, s)
	}
	writeJSON(w, http.StatusOK, settings)
}

func handleUpdateSetting(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")

	var body struct {
		Value string `json:"value"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	body.Value = strings.TrimSpace(body.Value)
	if body.Value == "" {
		writeError(w, http.StatusBadRequest, "value cannot be empty")
		return
	}

	now := time.Now()
	result, err := db.DB.Exec(
		"UPDATE settings SET value = ?, updated_at = ? WHERE key = ?",
		body.Value, now, key,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update setting")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "setting not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		diff, _ := json.Marshal(map[string]string{"value": body.Value})
		LogChange(&user.ID, "settings", key, "update", string(diff))
	}

	writeJSON(w, http.StatusOK, types.Setting{Key: key, Value: body.Value, UpdatedAt: now})
}
