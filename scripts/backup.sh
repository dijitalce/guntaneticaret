#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT=${1:-"./backups"}
mkdir -p "$OUT"
docker compose exec -T postgres pg_dump -U guntan guntan | gzip > "$OUT/guntan-$STAMP.sql.gz"
echo "Wrote $OUT/guntan-$STAMP.sql.gz"
