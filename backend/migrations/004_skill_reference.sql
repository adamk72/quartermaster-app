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

