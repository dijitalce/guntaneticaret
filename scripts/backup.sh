#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT=${1:-"./backups"}
mkdir -p "$OUT"
FILE="$OUT/guntan-$STAMP.sql.gz"

if [[ -n "${DATABASE_URL:-}" ]] && ! [[ "$DATABASE_URL" =~ localhost|127\.0\.0\.1 ]]; then
  pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$FILE"
else
  docker compose exec -T postgres pg_dump -U guntan guntan | gzip > "$FILE"
fi

echo "Wrote $FILE"
