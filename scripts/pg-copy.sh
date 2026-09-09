#!/usr/bin/env bash
# Postgres kopyası: Supabase (veya herhangi bir kaynak) → RDS.
# Kullanım:
#   export SRC='postgres://postgres:...@db.XXXX.supabase.co:5432/postgres'
#   export DST='postgres://USER:SIFRE@xxx.rds.amazonaws.com:5432/guntan?sslmode=require'
#   ./scripts/pg-copy.sh
set -euo pipefail

if [[ -z "${SRC:-}" || -z "${DST:-}" ]]; then
  echo "SRC ve DST env zorunlu." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null || ! command -v pg_restore >/dev/null; then
  echo "pg_dump / pg_restore gerekli. macOS: brew install postgresql@17" >&2
  exit 1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
DUMP="/tmp/guntan-pg-copy-$STAMP.dump"

echo "→ Dump (custom format)"
pg_dump "$SRC" --no-owner --no-acl -Fc -f "$DUMP"

echo "→ Restore"
# Extension/ownership uyarıları normal; --clean hedefte eski şema varsa siler.
pg_restore --no-owner --no-acl --clean --if-exists -d "$DST" "$DUMP" || true

echo "→ Kontrol"
psql "$DST" -c "select pg_size_pretty(pg_database_size(current_database())) as db;"
psql "$DST" -c "select count(*) as products from products;"
psql "$DST" -c "select count(*) as orders from orders;"

rm -f "$DUMP"
echo "Tamam. Hostinger DATABASE_URL = DST yapıp uygulamayı restart et."
