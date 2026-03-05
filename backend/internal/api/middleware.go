package api

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

type contextKey string

const userContextKey contextKey = "user"

type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

var CORSOrigin string

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := CORSOrigin
		if origin == "" {
			origin = r.Header.Get("Origin")
			// Only allow same-host origins (localhost dev or same-origin production)
			if origin != "" && !strings.HasPrefix(origin, "http://localhost:") && !strings.HasPrefix(origin, "http://127.0.0.1:") {
				origin = ""
			}
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, `{"error":"authorization required"}`, http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(header, "Bearer ")
		if token == header {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		var user types.User
		var expiresAt *time.Time
		err := db.DB.QueryRow(
			"SELECT id, username, character_id, created_at, token_expires_at FROM users WHERE session_token = ?",
			token,
		).Scan(&user.ID, &user.Username, &user.CharacterID, &user.CreatedAt, &expiresAt)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		if expiresAt != nil && time.Now().After(*expiresAt) {
			http.Error(w, `{"error":"token expired"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, &user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUser(r *http.Request) *types.User {
	user, _ := r.Context().Value(userContextKey).(*types.User)
	return user
}

func LogChange(userID *string, tableName, recordID, action, diffJSON string) {
	_, err := db.DB.Exec(
		"INSERT INTO changelog (user_id, table_name, record_id, action, diff_json) VALUES (?, ?, ?, ?, ?)",
		userID, tableName, recordID, action, diffJSON,
	)
	if err != nil {
		log.Printf("Error logging change: %v", err)
	}
}
