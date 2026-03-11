package api

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/types"
)

const tokenLifetime = 30 * 24 * time.Hour // 30 days

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req types.LoginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// If character_id provided, resolve character name as username
	if req.CharacterID != nil && *req.CharacterID != "" {
		var charName string
		err := db.DB.QueryRow("SELECT name FROM characters WHERE id = ?", *req.CharacterID).Scan(&charName)
		if err != nil {
			writeError(w, http.StatusBadRequest, "character not found")
			return
		}
		req.Username = charName
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		writeError(w, http.StatusBadRequest, "username required")
		return
	}

	inviteCode, err := GetSetting("invite_code")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "invite code not configured")
		return
	}
	if req.InviteCode != inviteCode {
		writeError(w, http.StatusForbidden, "invalid invite code")
		return
	}

	token := generateToken()
	expiresAt := time.Now().Add(tokenLifetime)
	slug := strings.ToLower(strings.ReplaceAll(req.Username, " ", "-"))

	// Upsert user
	if req.CharacterID != nil && *req.CharacterID != "" {
		_, err = db.DB.Exec(`
			INSERT INTO users (id, username, character_id, invite_code, session_token, token_expires_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(username) DO UPDATE SET character_id = ?, session_token = ?, token_expires_at = ?`,
			slug, req.Username, *req.CharacterID, req.InviteCode, token, expiresAt,
			*req.CharacterID, token, expiresAt,
		)
	} else {
		_, err = db.DB.Exec(`
			INSERT INTO users (id, username, invite_code, session_token, token_expires_at)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(username) DO UPDATE SET session_token = ?, token_expires_at = ?`,
			slug, req.Username, req.InviteCode, token, expiresAt, token, expiresAt,
		)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	var user types.User
	db.DB.QueryRow("SELECT id, username, character_id, created_at FROM users WHERE id = ?", slug).
		Scan(&user.ID, &user.Username, &user.CharacterID, &user.CreatedAt)

	writeJSON(w, http.StatusOK, types.LoginResponse{Token: token, User: user})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	user := GetUser(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	_, err := db.DB.Exec(
		"UPDATE users SET session_token = '', token_expires_at = NULL WHERE id = ?",
		user.ID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to logout")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	user := GetUser(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func handlePublicCharacters(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT c.id, c.name, c.player_name, c.icon,
			CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS active
		FROM characters c
		LEFT JOIN users u ON u.character_id = c.id
			AND u.session_token != ''
			AND u.token_expires_at > datetime('now')
		ORDER BY c.name
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query characters")
		return
	}
	defer rows.Close()

	type publicChar struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		PlayerName string `json:"player_name"`
		Icon       string `json:"icon"`
		Active     bool   `json:"active"`
	}

	chars := []publicChar{}
	for rows.Next() {
		var c publicChar
		if err := rows.Scan(&c.ID, &c.Name, &c.PlayerName, &c.Icon, &c.Active); err != nil {
			log.Printf("Error scanning public character row: %v", err)
			continue
		}
		chars = append(chars, c)
	}
	writeJSON(w, http.StatusOK, chars)
}

func handleActiveUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT u.id, u.username, u.character_id, COALESCE(c.name, ''), COALESCE(c.icon, '')
		FROM users u
		LEFT JOIN characters c ON u.character_id = c.id
		WHERE u.token_expires_at > datetime('now')
		  AND u.session_token != ''
		  AND u.character_id IS NOT NULL
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query active users")
		return
	}
	defer rows.Close()

	users := []types.ActiveUser{}
	for rows.Next() {
		var u types.ActiveUser
		if err := rows.Scan(&u.ID, &u.Username, &u.CharacterID, &u.CharacterName, &u.Icon); err != nil {
			log.Printf("Error scanning active user row: %v", err)
			continue
		}
		users = append(users, u)
	}
	writeJSON(w, http.StatusOK, users)
}

func handleForceLogout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CharacterID string `json:"character_id"`
		AdminCode   string `json:"admin_code"`
	}
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.CharacterID == "" || req.AdminCode == "" {
		writeError(w, http.StatusBadRequest, "character_id and admin_code required")
		return
	}

	adminCode, err := GetSetting("admin_code")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "admin code not configured")
		return
	}
	if req.AdminCode != adminCode {
		writeError(w, http.StatusForbidden, "invalid admin code")
		return
	}

	result, err := db.DB.Exec(
		"UPDATE users SET session_token = '', token_expires_at = NULL WHERE character_id = ?",
		req.CharacterID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to force logout")
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		writeError(w, http.StatusNotFound, "no active session for that character")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
