package main

import (
	"log"
	"net/http"
	"os"

	"github.com/adamk72/quartermaster-app/internal/api"
	"github.com/adamk72/quartermaster-app/internal/db"
	"github.com/adamk72/quartermaster-app/internal/spa"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "9090"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/campaign.db"
	}

	api.CORSOrigin = os.Getenv("CORS_ORIGIN")

	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = "uploads"
	}
	api.UploadsDir = uploadsDir
	os.MkdirAll(uploadsDir, 0755)
	os.MkdirAll("data", 0755)

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}

	if err := db.Init(dbPath, os.DirFS(migrationsDir)); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Seed invite code from env var (only if not already set in DB)
	inviteCode := os.Getenv("INVITE_CODE")
	if inviteCode == "" {
		inviteCode = "dragons"
	}
	if _, err := db.DB.Exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('invite_code', ?)", inviteCode); err != nil {
		log.Fatalf("Failed to seed invite code: %v", err)
	}

	mux := http.NewServeMux()
	api.RegisterRoutes(mux)

	// Serve frontend static files (from make build) or fall back to SPA routing
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "static"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		spaHandler := spa.NewHandler(os.DirFS(staticDir))
		mux.Handle("/", spaHandler)
	}

	handler := api.Chain(mux, api.Logger, api.CORS)

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
