#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-prod}"

case "$ENV" in
  dev)  EXPORT_DIR="data/export/dev";  ARCHIVE_DIR="data/archives/dev" ;;
  prod) EXPORT_DIR="data/export/prod"; ARCHIVE_DIR="data/archives/prod" ;;
  *)    echo "Usage: $0 [dev|prod]  (default: prod)"; exit 1 ;;
esac

if [ ! -d "$EXPORT_DIR" ] || [ -z "$(ls -A "$EXPORT_DIR" 2>/dev/null)" ]; then
  echo "No export files found in $EXPORT_DIR — run 'make ${ENV}-export' first"
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

# Find next ID by scanning existing archives
last_id=$(ls "$ARCHIVE_DIR"/${ENV}-*.zip 2>/dev/null \
  | sed "s/.*${ENV}-\([0-9]*\)-.*/\1/" \
  | sort -n | tail -1 || true)
next_id=$(printf "%03d" $(( ${last_id:-0} + 1 )))

date_stamp=$(date +%Y%m%d-%H%M)
filename="${ENV}-${next_id}-${date_stamp}.zip"

(cd "$EXPORT_DIR" && zip -q "$OLDPWD/$ARCHIVE_DIR/$filename" *.json)

echo "Archived → $ARCHIVE_DIR/$filename"
