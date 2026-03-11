# Inventory Import — AI Conversion Prompt

Copy the prompt below and paste it into ChatGPT, Claude, or any AI assistant along with your spreadsheet data.

---

Convert the following tab-separated spreadsheet data into a JSON array. Each row becomes one object. The columns are separated by tabs.

**Column mapping:**
- `Qty` → `quantity` (integer, default 1 if blank)
- `Item` → `name` (string, required)
- `Credit` → `unit_value_gp` (number — strip "gp"/"sp" suffix, remove commas, convert to gp. E.g., "100 gp" → 100, "1,500 gp" → 1500, "5 sp" → 0.5. Use `null` if blank)
- `Debit` → ignore this column
- `Game Date` → `game_date` (string, keep as-is in M/D or M/D/YY format)
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
- "Bill the Mule" → `"bill-the-mule"`
- "Quiver of Sylvana" → `"quiver-of-sylvana"`
- "Cached" → `"cached"`
- Any other value → use the value lowercased with spaces replaced by hyphens

**Important rules:**
- If a row is a duplicate of an earlier row (same item name), skip it — only keep the first occurrence
- Strip "x2", "x3", etc. suffixes from item names if the Qty column already has that number
- Return ONLY a JSON array, no markdown code fences, no explanation

**Output format example:**

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

**Here is the spreadsheet data:**

<paste data here>
