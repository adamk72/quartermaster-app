package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/adamk72/quartermaster-app/internal/db"
)

func main() {
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

	// Seed characters
	seedCharacters()

	// Seed containers
	seedContainers()

	// Seed items from CSV
	seedItemsFromCSV("../docs/archive/Eric's D&D Campaign Group Treasure - 💹 Income and Expenses.csv")

	log.Println("Seed complete!")
}

func seedCharacters() {
	characters := []struct {
		id, name, playerName, class, race string
		level                             int
	}{
		{"andurin", "Andurin", "", "Fighter", "Human", 5},
		{"ayloc", "Ayloc", "", "Rogue", "Halfling", 5},
		{"ruya", "Rüya", "", "Cleric", "Human", 5},
		{"sachan", "Sachan", "", "Ranger", "Elf", 5},
		{"ingvild", "Ingvild", "", "Wizard", "Human", 5},
		{"hrothgar", "Hrothgar", "", "Barbarian", "Half-Orc", 5},
	}

	for _, c := range characters {
		_, err := db.DB.Exec(
			"INSERT OR IGNORE INTO characters (id, name, player_name, class, level, race) VALUES (?, ?, ?, ?, ?, ?)",
			c.id, c.name, c.playerName, c.class, c.level, c.race,
		)
		if err != nil {
			log.Printf("Error seeding character %s: %v", c.name, err)
		}
	}
	log.Println("Seeded characters")
}

func seedContainers() {
	containers := []struct {
		id, name, typ, charID string
	}{
		{"bag-of-holding", "Bag of Holding", "bag", "ayloc"},
		{"andurin", "Andurin", "character", "andurin"},
		{"ayloc", "Ayloc", "character", "ayloc"},
		{"ruya", "Rüya", "character", "ruya"},
		{"sachan", "Sachan", "character", "sachan"},
		{"ingvild", "Ingvild", "character", "ingvild"},
		{"hrothgar", "Hrothgar", "character", "hrothgar"},
		{"cached", "Cached/Stored", "cache", ""},
		{"quiver-of-sylvana", "Quiver of Sylvana", "bag", "sachan"},
		{"bill-the-mule", "Bill the Mule", "mount", ""},
	}

	for _, c := range containers {
		var charID *string
		if c.charID != "" {
			charID = &c.charID
		}
		_, err := db.DB.Exec(
			"INSERT OR IGNORE INTO containers (id, name, type, character_id) VALUES (?, ?, ?, ?)",
			c.id, c.name, c.typ, charID,
		)
		if err != nil {
			log.Printf("Error seeding container %s: %v", c.name, err)
		}
	}
	log.Println("Seeded containers")
}

func seedItemsFromCSV(path string) {
	f, err := os.Open(path)
	if err != nil {
		log.Printf("Could not open CSV: %v", err)
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	if err != nil {
		log.Printf("Error reading CSV: %v", err)
		return
	}

	// Find header row
	headerIdx := -1
	for i, row := range records {
		if len(row) > 2 && row[0] == "Sold" && row[1] == "Qty" {
			headerIdx = i
			break
		}
	}
	if headerIdx < 0 {
		log.Println("Could not find header row in CSV")
		return
	}

	count := 0
	for _, row := range records[headerIdx+1:] {
		if len(row) < 10 || strings.TrimSpace(row[2]) == "" {
			continue
		}

		sold := strings.EqualFold(strings.TrimSpace(row[0]), "TRUE")
		qty := parseIntOr(strings.TrimSpace(row[1]), 1)
		name := strings.TrimSpace(row[2])
		gameDate := strings.TrimSpace(row[5])
		category := strings.TrimSpace(row[6])
		who := strings.TrimSpace(row[7])

		if category == "" {
			category = "Item"
		}

		containerID := mapWhoToContainer(who)
		addedToDnDB := strings.EqualFold(strings.TrimSpace(row[8]), "TRUE")

		var unitWeight, unitValue *float64
		if len(row) > 14 {
			unitWeight = parseFloatOrNil(strings.TrimSpace(row[14]))
		}
		if len(row) > 15 {
			unitValue = parseFloatOrNil(strings.TrimSpace(row[15]))
		}

		var singular, notes string
		if len(row) > 16 {
			singular = strings.TrimSpace(row[16])
		}
		if len(row) > 17 {
			notes = strings.TrimSpace(row[17])
		}

		_, err := db.DB.Exec(
			`INSERT INTO items (name, quantity, game_date, category, container_id, sold, unit_weight_lbs, unit_value_gp, added_to_dndbeyond, singular, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			name, qty, gameDate, category, containerID, sold, unitWeight, unitValue, addedToDnDB, singular, notes,
		)
		if err != nil {
			log.Printf("Error inserting item %q: %v", name, err)
		} else {
			count++
		}
	}

	log.Printf("Seeded %d items from CSV", count)
}

func mapWhoToContainer(who string) *string {
	mapping := map[string]string{
		"Andurin":            "andurin",
		"Ayloc":              "ayloc",
		"Rüya":               "ruya",
		"Sachan":             "sachan",
		"Ingvild":            "ingvild",
		"Hrothgar":           "hrothgar",
		"Bag of Holding":     "bag-of-holding",
		"Cached":             "cached",
		"Quiver of Sylvana":  "quiver-of-sylvana",
		"Bill the Mule":      "bill-the-mule",
	}

	if id, ok := mapping[who]; ok {
		return &id
	}
	if who != "" {
		s := strings.ToLower(strings.ReplaceAll(who, " ", "-"))
		return &s
	}
	return nil
}

func cleanGP(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSuffix(s, " gp")
	s = strings.TrimSuffix(s, "gp")
	return s
}

func parseFloatOrNil(s string) *float64 {
	if s == "" || s == "--" {
		return nil
	}
	var v float64
	if _, err := fmt.Sscanf(s, "%f", &v); err == nil {
		return &v
	}
	return nil
}

func parseIntOr(s string, def int) int {
	if s == "" {
		return def
	}
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err == nil {
		return v
	}
	return def
}
