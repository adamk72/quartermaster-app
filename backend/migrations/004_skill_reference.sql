-- Skill reference data (per-skill metadata)
CREATE TABLE IF NOT EXISTS skill_reference (
    skill_name TEXT PRIMARY KEY,
    num_proficient INTEGER NOT NULL DEFAULT 0,
    modifier TEXT NOT NULL DEFAULT '',
    best_combo TEXT NOT NULL DEFAULT ''
);

INSERT INTO skill_reference (skill_name, num_proficient, modifier, best_combo) VALUES
    ('Acrobatics', 1, 'dex', 'Sachan *'),
    ('Animal Handling', 1, 'wis', 'Ayloc help Ruya'),
    ('Arcana', 2, 'int', 'Ruya help Ingvild'),
    ('Athletics', 3, 'str', 'Hrothgar/Sachan help Andurin *'),
    ('Deception', 1, 'cha', 'Sachan help Ayloc'),
    ('History', 2, 'int', 'Ayloc help Ingvild'),
    ('Insight', 3, 'wis', 'Hrothgar/Sachan help Ruya'),
    ('Intimidation', 3, 'cha', 'Andurin/Hrothgar help Ayloc'),
    ('Investigation', 2, 'int', 'Sachan help Ingvild'),
    ('Medicine', 0, 'wis', 'Ruya'),
    ('Nature', 1, 'int', 'Ayloc help Ingvild/Ruya'),
    ('Perception', 3, 'wis', 'Andurin/Ayloc help Sachan'),
    ('Performance', 0, 'cha', 'Ayloc'),
    ('Persuasion', 4, 'cha', 'Hrothgar/Sachan help Andurin/Ayloc'),
    ('Religion', 3, 'int', 'Andurin/Ruya help Ingvild'),
    ('Sleight of Hand', 1, 'dex', 'Sachan *'),
    ('Stealth', 3, 'dex', 'Ayloc/Ruya help Sachan *'),
    ('Survival', 3, 'wis', 'Hrothgar/Sachan help Ruya');

-- Seed per-character skill bonuses
-- Clear existing skills first
DELETE FROM skills;

-- Andurin
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('andurin', 'Acrobatics', 1, 0, 0),
    ('andurin', 'Animal Handling', 1, 0, 0),
    ('andurin', 'Arcana', 1, 0, 0),
    ('andurin', 'Athletics', 8, 1, 0),
    ('andurin', 'Deception', 4, 0, 0),
    ('andurin', 'History', 1, 0, 0),
    ('andurin', 'Insight', 1, 0, 0),
    ('andurin', 'Intimidation', 7, 1, 0),
    ('andurin', 'Investigation', 1, 0, 0),
    ('andurin', 'Medicine', 1, 0, 0),
    ('andurin', 'Nature', 1, 0, 0),
    ('andurin', 'Perception', 4, 1, 0),
    ('andurin', 'Performance', 4, 0, 0),
    ('andurin', 'Persuasion', 7, 1, 0),
    ('andurin', 'Religion', 4, 1, 0),
    ('andurin', 'Sleight of Hand', 1, 0, 0),
    ('andurin', 'Stealth', 1, 0, 0),
    ('andurin', 'Survival', 1, 0, 0);

-- Ayloc
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('ayloc', 'Acrobatics', 3, 0, 0),
    ('ayloc', 'Animal Handling', 4, 1, 0),
    ('ayloc', 'Arcana', 2, 0, 0),
    ('ayloc', 'Athletics', 1, 0, 0),
    ('ayloc', 'Deception', 5, 1, 0),
    ('ayloc', 'History', 5, 1, 0),
    ('ayloc', 'Insight', 1, 0, 0),
    ('ayloc', 'Intimidation', 8, 1, 0),
    ('ayloc', 'Investigation', 2, 0, 0),
    ('ayloc', 'Medicine', 1, 0, 0),
    ('ayloc', 'Nature', 5, 1, 0),
    ('ayloc', 'Perception', 4, 1, 0),
    ('ayloc', 'Performance', 5, 1, 0),
    ('ayloc', 'Persuasion', 8, 1, 0),
    ('ayloc', 'Religion', 2, 0, 0),
    ('ayloc', 'Sleight of Hand', 3, 0, 0),
    ('ayloc', 'Stealth', 6, 1, 0),
    ('ayloc', 'Survival', 1, 0, 0);

-- Hrothgar
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('hrothgar', 'Acrobatics', 0, 0, 0),
    ('hrothgar', 'Animal Handling', 2, 0, 0),
    ('hrothgar', 'Arcana', 0, 0, 0),
    ('hrothgar', 'Athletics', 7, 1, 0),
    ('hrothgar', 'Deception', 1, 0, 0),
    ('hrothgar', 'History', 0, 0, 0),
    ('hrothgar', 'Insight', 5, 1, 0),
    ('hrothgar', 'Intimidation', 4, 1, 0),
    ('hrothgar', 'Investigation', 0, 0, 0),
    ('hrothgar', 'Medicine', 2, 0, 0),
    ('hrothgar', 'Nature', 0, 0, 0),
    ('hrothgar', 'Perception', 2, 0, 0),
    ('hrothgar', 'Performance', 1, 0, 0),
    ('hrothgar', 'Persuasion', 4, 1, 0),
    ('hrothgar', 'Religion', 0, 0, 0),
    ('hrothgar', 'Sleight of Hand', 0, 0, 0),
    ('hrothgar', 'Stealth', 0, 0, 0),
    ('hrothgar', 'Survival', 5, 1, 0);

-- Ingvild
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('ingvild', 'Acrobatics', 2, 0, 0),
    ('ingvild', 'Animal Handling', -1, 0, 0),
    ('ingvild', 'Arcana', 11, 1, 1),
    ('ingvild', 'Athletics', -1, 0, 0),
    ('ingvild', 'Deception', 1, 0, 0),
    ('ingvild', 'History', 8, 1, 0),
    ('ingvild', 'Insight', -1, 0, 0),
    ('ingvild', 'Intimidation', 1, 0, 0),
    ('ingvild', 'Investigation', 11, 1, 1),
    ('ingvild', 'Medicine', -1, 0, 0),
    ('ingvild', 'Nature', 5, 1, 0),
    ('ingvild', 'Perception', -1, 0, 0),
    ('ingvild', 'Performance', 1, 0, 0),
    ('ingvild', 'Persuasion', 1, 0, 0),
    ('ingvild', 'Religion', 8, 1, 0),
    ('ingvild', 'Sleight of Hand', 2, 0, 0),
    ('ingvild', 'Stealth', 2, 0, 0),
    ('ingvild', 'Survival', -1, 0, 0);

-- Ruya
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('ruya', 'Acrobatics', 2, 0, 0),
    ('ruya', 'Animal Handling', 4, 1, 0),
    ('ruya', 'Arcana', 8, 1, 0),
    ('ruya', 'Athletics', -1, 0, 0),
    ('ruya', 'Deception', -1, 0, 0),
    ('ruya', 'History', 1, 0, 0),
    ('ruya', 'Insight', 7, 1, 0),
    ('ruya', 'Intimidation', -1, 0, 0),
    ('ruya', 'Investigation', 1, 0, 0),
    ('ruya', 'Medicine', 4, 1, 0),
    ('ruya', 'Nature', 5, 1, 0),
    ('ruya', 'Perception', 4, 1, 0),
    ('ruya', 'Performance', -1, 0, 0),
    ('ruya', 'Persuasion', -1, 0, 0),
    ('ruya', 'Religion', 4, 1, 0),
    ('ruya', 'Sleight of Hand', 2, 0, 0),
    ('ruya', 'Stealth', 5, 1, 0),
    ('ruya', 'Survival', 7, 1, 0);

-- Sachan
INSERT INTO skills (character_id, skill_name, bonus, proficient, expertise) VALUES
    ('sachan', 'Acrobatics', 7, 1, 0),
    ('sachan', 'Animal Handling', -1, 0, 0),
    ('sachan', 'Arcana', 4, 0, 0),
    ('sachan', 'Athletics', 4, 1, 0),
    ('sachan', 'Deception', 3, 0, 0),
    ('sachan', 'History', 4, 0, 0),
    ('sachan', 'Insight', 2, 0, 0),
    ('sachan', 'Intimidation', 0, 0, 0),
    ('sachan', 'Investigation', 10, 1, 1),
    ('sachan', 'Medicine', -1, 0, 0),
    ('sachan', 'Nature', 4, 0, 0),
    ('sachan', 'Perception', 5, 1, 0),
    ('sachan', 'Performance', 0, 0, 0),
    ('sachan', 'Persuasion', 3, 1, 0),
    ('sachan', 'Religion', 4, 1, 0),
    ('sachan', 'Sleight of Hand', 15, 1, 1),
    ('sachan', 'Stealth', 10, 1, 1),
    ('sachan', 'Survival', 2, 0, 0);
