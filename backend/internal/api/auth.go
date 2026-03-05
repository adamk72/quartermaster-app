package api

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

var InviteCode string

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req types.LoginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" {
		writeError(w, http.StatusBadRequest, "username required")
		return
	}

	if req.InviteCode != InviteCode {
		writeError(w, http.StatusForbidden, "invalid invite code")
		return
	}

	token := generateToken()
	slug := strings.ToLower(strings.ReplaceAll(req.Username, " ", "-"))

	// Upsert user
	_, err := db.DB.Exec(`
		INSERT INTO users (id, username, invite_code, session_token)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(username) DO UPDATE SET session_token = ?`,
		slug, req.Username, req.InviteCode, token, token,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	var user types.User
	db.DB.QueryRow("SELECT id, username, character_id, created_at FROM users WHERE id = ?", slug).
		Scan(&user.ID, &user.Username, &user.CharacterID, &user.CreatedAt)

	writeJSON(w, http.StatusOK, types.LoginResponse{Token: token, User: user})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	user := GetUser(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
