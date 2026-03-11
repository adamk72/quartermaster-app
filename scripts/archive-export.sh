#!/usr/bin/env bash
set -euo pipefail

EXPORT_DIR="backend/data/export"
ARCHIVE_DIR="backend/data/archives"

if [ ! -d "$EXPORT_DIR" ] || [ -z "$(ls -A "$EXPORT_DIR" 2>/dev/null)" ]; then
  echo "No export files found in $EXPORT_DIR"
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

# Find next ID by scanning existing archives
last_id=$(ls "$ARCHIVE_DIR"/export-*.zip 2>/dev/null \
  | sed 's/.*export-\([0-9]*\)-.*/\1/' \
  | sort -n | tail -1 || true)
next_id=$(printf "%03d" $(( ${last_id:-0} + 1 )))

date_stamp=$(date +%Y%m%d-%H%M)
filename="export-${next_id}-${date_stamp}.zip"

(cd "$EXPORT_DIR" && zip -q "../archives/$filename" *.json)

echo "Archived → $ARCHIVE_DIR/$filename"
