# Editable Skills Sheet

## Overview
Make the Skills Matrix page editable so users can update bonus, proficiency, and expertise for each character/skill combination without typing — all click-based.

## UX Design

### Edit Mode Toggle
- "Edit" button in the page header next to "Skill Matrix" title
- Clicking switches the table to edit mode; button becomes "Cancel" + "Save All"

### Edit Mode Cells
- **Bonus**: Up/down triangle arrows to increment/decrement (no text input)
- **Proficiency/Expertise**: Single cycling badge per cell: `–` (none) → `P` (proficient, sky blue) → `E` (expertise, purple) → `–`
- NumP, Mod, and Best Person/Combo columns remain read-only
- Green "highest in party" highlighting hidden during edit mode

### Save Behavior
- "Save All" collects all skills, groups by character, sends one `PUT /api/v1/skills/{character_id}` per character (existing bulk endpoint)
- On success: exit edit mode, refresh table
- On error: show alert, stay in edit mode

### Cancel
- Discards unsaved changes, reverts to read-only view

## Backend
No changes needed. Existing PUT endpoint and data model already support bonus, proficient, and expertise fields.

## Mockups
See `.superpowers/brainstorm/76193-1773283317/edit-mode-cells-v3.html` for the interactive prototype.
