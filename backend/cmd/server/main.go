package main

import (
	"log"
	"net/http"
	"os"

	"github.com/adamk72/quartermaster-app/internal/api"
	"github.com/adamk72/quartermaster-app/internal/db"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/campaign.db"
	}

	api.InviteCode = os.Getenv("INVITE_CODE")
	if api.InviteCode == "" {
		api.InviteCode = "dragons"
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

	mux := http.NewServeMux()
	api.RegisterRoutes(mux)

	handler := api.Chain(mux, api.Logger, api.CORS)

	log.Printf("Server starting on :%s", port)
	log.Printf("Invite code: %s", api.InviteCode)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
