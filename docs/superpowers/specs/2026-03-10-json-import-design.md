# JSON Import for Inventory

## Overview
Bulk import items into the inventory via JSON paste. The user exports a spreadsheet to CSV, feeds it to an AI with a conversion prompt, and pastes the resulting JSON into the app.

## Spreadsheet Columns
Qty, Item, Credit, Debit, Game Date, Category, Who, Location/Vendor/Notes

## Mapping
| Spreadsheet Column | App Field | Notes |
|---|---|---|
| Qty | `quantity` | Default 1 if blank |
| Item | `name` | Required |
| Credit | `unit_value_gp` | Parse number only ("100 gp" -> 100), null if blank |
| Debit | (ignored) | |
| Game Date | `game_date` | M/D format |
| Category | (ignored) | Labels assigned after import |
| Who | `container_id` | Match to existing container IDs |
| Location/Vendor/Notes | `notes` | Empty string if blank |

## JSON Format (AI Output)
```json
[
  {
    "name": "Sceptre (from Vaelith)",
    "quantity": 1,
    "unit_value_gp": null,
    "game_date": "10/22",
    "container_id": "party",
    "notes": ""
  }
]
```

## Backend
- `POST /api/v1/items/import` — accepts JSON array of items
- Creates all items in a single transaction
- Validates: `name` required, `container_id` must exist in DB
- Assigns `sort_order` sequentially starting from max existing + 1
- Creates changelog entries for each item
- Returns `{ "count": N, "items": [...] }`
- Additive only, no duplicate checking

## Frontend
- "Import" button on Inventory page near "Add Item" button
- Opens modal with textarea to paste JSON
- Preview step: table showing name, qty, value, container, date before committing
- Success message with count of imported items
- Error display if validation fails

## AI Conversion Prompt
- Saved to `docs/import-prompt.md`
- Instructs AI to convert CSV to the JSON format above
- Includes container ID mapping rules and value parsing
