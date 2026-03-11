# Inventory CSV → JSON Conversion Prompt

Copy the prompt below and paste it into ChatGPT, Claude, or any AI assistant along with your CSV data.

---

Convert the following CSV data into a JSON array. Each row becomes one object.

**Column mapping:**
- `Qty` → `quantity` (integer, default 1 if blank)
- `Item` → `name` (string, required)
- `Credit` → `unit_value_gp` (number — strip "gp"/"sp" suffix, convert to gp. E.g., "100 gp" → 100, "5 sp" → 0.5. Use `null` if blank)
- `Debit` → ignore this column
- `Game Date` → `game_date` (string, keep as-is in M/D format)
- `Category` → ignore this column
- `Who` → `container_id` (string, map using the table below. Use `null` if blank)
- `Location/Vendor/Notes` → `notes` (string, use "" if blank)

**Container ID mapping for "Who" column:**
- "Party" or "party" → `"party"`
- "Andurin" → `"andurin"`
- "Ayloc" → `"ayloc"`
- "Rüya" or "Ruya" → `"ruya"`
- "Sachan" → `"sachan"`
- "Ingvild" → `"ingvild"`
- "Hrothgar" → `"hrothgar"`
- "Bag of Holding" → `"bag-of-holding"`
- Any other value → use the value lowercased with spaces replaced by hyphens

**Output format:**
Return ONLY a JSON array, no markdown code fences, no explanation. Example:

[
  {
    "name": "Longsword",
    "quantity": 1,
    "unit_value_gp": 15,
    "game_date": "10/22",
    "container_id": "party",
    "notes": ""
  }
]

**Here is the CSV data:**

<paste CSV here>
