# Treasure Parsing Project

## Overview
This project parses a D&D campaign journal (Google Doc export) to extract treasure items and format them for import into a Google Spreadsheet.

## Key Files
- `raw.txt` — Full text of the campaign journal
- `treasure.csv` — All extracted treasure items with dates, magic status, and estimated values
- `merged_new_items.csv` — Items not yet in the existing spreadsheet, formatted to match its column structure
- `Eric's D&D Campaign Group Treasure - 💹 Income and Expenses.csv` — Export of the existing Google Spreadsheet

## Spreadsheet Format
The Google Sheet uses these columns:
`Sold, Qty, Item, Credit, Debit, Game Date, Category, Who, Added to D&D Beyond, LB/GP, Total Weight (lbs), Override Weight, Override units, Calculated Units, Unit Weight, Unit Value, Singluar, Location/Vendor/Notes`

- Game dates use M/D format for 2025, M/D/YY for 2026
- Magic items have Category "Magic"
- Items are assigned to a person or "Bag of Holding"
- Credit = sell/value, Debit = expenses
- `Sold` column is TRUE/FALSE

## Conventions
- TBI = "to be identified" (magic items not yet IDed)
- Party members: Andurin, Ayloc, Rüya, Sachan, Ingvild, Hrothgar
- Currency conversion: 1pp = 10gp, 1ep = 0.5gp, 1sp = 0.1gp, 1cp = 0.01gp
