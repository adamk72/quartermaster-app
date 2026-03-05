package api

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListSessions(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, game_date, title, body_json, body_html, xp_gained, created_by, created_at, updated_at FROM sessions ORDER BY game_date DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query sessions")
		return
	}
	defer rows.Close()

	sessions := []types.Session{}
	for rows.Next() {
		var s types.Session
		rows.Scan(&s.ID, &s.GameDate, &s.Title, &s.BodyJSON, &s.BodyHTML, &s.XPGained, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt)
		sessions = append(sessions, s)
	}
	writeJSON(w, http.StatusOK, sessions)
}

func handleGetSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var s types.Session
	err := db.DB.QueryRow("SELECT id, game_date, title, body_json, body_html, xp_gained, created_by, created_at, updated_at FROM sessions WHERE id = ?", id).
		Scan(&s.ID, &s.GameDate, &s.Title, &s.BodyJSON, &s.BodyHTML, &s.XPGained, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	// Load images
	imgRows, err := db.DB.Query("SELECT id, session_id, filename, caption, sort_order FROM session_images WHERE session_id = ? ORDER BY sort_order", id)
	if err == nil {
		defer imgRows.Close()
		for imgRows.Next() {
			var img types.SessionImage
			imgRows.Scan(&img.ID, &img.SessionID, &img.Filename, &img.Caption, &img.SortOrder)
			s.Images = append(s.Images, img)
		}
	}

	writeJSON(w, http.StatusOK, s)
}

func handleCreateSession(w http.ResponseWriter, r *http.Request) {
	var s types.Session
	if err := readJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now

	user := GetUser(r)
	if user != nil {
		s.CreatedBy = &user.ID
	}

	result, err := db.DB.Exec(
		"INSERT INTO sessions (game_date, title, body_json, body_html, xp_gained, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		s.GameDate, s.Title, s.BodyJSON, s.BodyHTML, s.XPGained, s.CreatedBy, s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to create session: %v", err))
		return
	}
	id, _ := result.LastInsertId()
	s.ID = int(id)

	if user != nil {
		LogChange(&user.ID, "sessions", strconv.Itoa(s.ID), "create", "{}")
	}

	writeJSON(w, http.StatusCreated, s)
}

func handleUpdateSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var s types.Session
	if err := readJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	s.UpdatedAt = time.Now()
	result, err := db.DB.Exec(
		"UPDATE sessions SET game_date=?, title=?, body_json=?, body_html=?, xp_gained=?, updated_at=? WHERE id=?",
		s.GameDate, s.Title, s.BodyJSON, s.BodyHTML, s.XPGained, s.UpdatedAt, id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update session")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "sessions", id, "update", "{}")
	}

	idInt, _ := strconv.Atoi(id)
	s.ID = idInt
	writeJSON(w, http.StatusOK, s)
}

func handleDeleteSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	result, err := db.DB.Exec("DELETE FROM sessions WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete session")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "sessions", id, "delete", "{}")
	}
	w.WriteHeader(http.StatusNoContent)
}

var UploadsDir = "uploads"

func handleUploadImage(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")

	r.ParseMultipartForm(10 << 20) // 10MB max
	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "image file required")
		return
	}
	defer file.Close()

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
	destPath := filepath.Join(UploadsDir, filename)

	dest, err := os.Create(destPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save image")
		return
	}
	defer dest.Close()
	io.Copy(dest, file)

	caption := r.FormValue("caption")
	sidInt, _ := strconv.Atoi(sessionID)

	result, err := db.DB.Exec(
		"INSERT INTO session_images (session_id, filename, caption, sort_order) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM session_images WHERE session_id = ?))",
		sidInt, filename, caption, sidInt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save image record")
		return
	}

	imgID, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, types.SessionImage{
		ID:        int(imgID),
		SessionID: sidInt,
		Filename:  filename,
		Caption:   caption,
	})
}
