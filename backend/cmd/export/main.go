package main

import (
	"encoding/json"
	"flag"
	"log"
	"os"

	"github.com/adamk72/quartermaster-app/internal/db"
)

func main() {
	restore := flag.Bool("restore", false, "Restore from JSON files instead of exporting")
	flag.Parse()

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/campaign.db"
	}
	os.MkdirAll("data", 0755)

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}

	if err := db.Init(dbPath, os.DirFS(migrationsDir)); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	exportDir := "data/export"
	os.MkdirAll(exportDir, 0755)

	if *restore {
		doRestore(exportDir)
	} else {
		doExport(exportDir)
	}
}

var tables = []string{
	"characters", "mounts", "containers", "items", "coin_ledger", "critters",
	"sessions", "session_images", "skills", "skill_reference", "xp_entries", "xp_attendance",
	"quests", "watch_schedules", "watch_slots", "consumable_types", "consumable_ledger",
	"users", "changelog",
}

func doExport(dir string) {
	for _, table := range tables {
		rows, err := db.DB.Query("SELECT * FROM " + table)
		if err != nil {
			log.Printf("Error querying %s: %v", table, err)
			continue
		}

		cols, _ := rows.Columns()
		var records []map[string]any

		for rows.Next() {
			values := make([]any, len(cols))
			ptrs := make([]any, len(cols))
			for i := range values {
				ptrs[i] = &values[i]
			}
			rows.Scan(ptrs...)

			record := make(map[string]any)
			for i, col := range cols {
				record[col] = values[i]
			}
			records = append(records, record)
		}
		rows.Close()

		if records == nil {
			records = []map[string]any{}
		}

		data, _ := json.MarshalIndent(records, "", "  ")
		path := dir + "/" + table + ".json"
		os.WriteFile(path, data, 0644)
		log.Printf("Exported %d records from %s", len(records), table)
	}

	log.Println("Export complete!")
}

func doRestore(dir string) {
	// Clear existing data
	for i := len(tables) - 1; i >= 0; i-- {
		db.DB.Exec("DELETE FROM " + tables[i])
	}

	for _, table := range tables {
		path := dir + "/" + table + ".json"
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Skipping %s: %v", table, err)
			continue
		}

		var records []map[string]any
		if err := json.Unmarshal(data, &records); err != nil {
			log.Printf("Error parsing %s: %v", table, err)
			continue
		}

		if len(records) == 0 {
			continue
		}

		// Get column names from first record
		cols := make([]string, 0, len(records[0]))
		for k := range records[0] {
			cols = append(cols, k)
		}

		placeholders := make([]string, len(cols))
		for i := range placeholders {
			placeholders[i] = "?"
		}

		query := "INSERT INTO " + table + " (" + joinStrings(cols, ",") + ") VALUES (" + joinStrings(placeholders, ",") + ")"

		count := 0
		for _, record := range records {
			values := make([]any, len(cols))
			for i, col := range cols {
				values[i] = record[col]
			}
			if _, err := db.DB.Exec(query, values...); err != nil {
				log.Printf("Error inserting into %s: %v", table, err)
			} else {
				count++
			}
		}
		log.Printf("Restored %d records into %s", count, table)
	}

	log.Println("Restore complete!")
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
