package api

import (
	"net/http"

	"github.com/adamghill/treasure-tracking/internal/db"
	"github.com/adamghill/treasure-tracking/internal/types"
)

func handleListSkills(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, character_id, skill_name, bonus, proficient, expertise FROM skills ORDER BY skill_name, character_id")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query skills")
		return
	}
	defer rows.Close()

	skills := []types.Skill{}
	for rows.Next() {
		var s types.Skill
		rows.Scan(&s.ID, &s.CharacterID, &s.SkillName, &s.Bonus, &s.Proficient, &s.Expertise)
		skills = append(skills, s)
	}
	writeJSON(w, http.StatusOK, skills)
}

func handleListSkillReferences(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT skill_name, num_proficient, modifier, best_combo FROM skill_reference ORDER BY skill_name")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query skill references")
		return
	}
	defer rows.Close()

	refs := []types.SkillReference{}
	for rows.Next() {
		var sr types.SkillReference
		rows.Scan(&sr.SkillName, &sr.NumProficient, &sr.Modifier, &sr.BestCombo)
		refs = append(refs, sr)
	}
	writeJSON(w, http.StatusOK, refs)
}

func handleUpdateSkills(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("character_id")

	var skills []types.Skill
	if err := readJSON(r, &skills); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}

	// Delete existing skills for this character and re-insert
	tx.Exec("DELETE FROM skills WHERE character_id = ?", charID)

	for _, s := range skills {
		tx.Exec(
			"INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES (?, ?, ?, ?, ?)",
			charID, s.SkillName, s.Bonus, s.Proficient, s.Expertise,
		)
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save skills")
		return
	}

	user := GetUser(r)
	if user != nil {
		LogChange(&user.ID, "skills", charID, "update", "{}")
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
