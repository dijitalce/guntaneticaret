#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
OUT=${1:-"./backups"}
mkdir -p "$OUT"
FILE="$OUT/guntan-$STAMP.sql.gz"

if [[ -n "${DATABASE_URL:-}" ]] && ! [[ "$DATABASE_URL" =~ localhost|127\.0\.0\.1 ]]; then
  # mysql://user:pass@host:3306/db — mysqldump wants discrete flags
  proto="${DATABASE_URL#mysql://}"
  userpass="${proto%%@*}"
  hostpath="${proto#*@}"
  user="${userpass%%:*}"
  # password may be URL-encoded
  pass_enc="${userpass#*:}"
  pass=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1]))" "$pass_enc")
  hostport="${hostpath%%/*}"
  db="${hostpath#*/}"
  db="${db%%\?*}"
  host="${hostport%%:*}"
  port="${hostport##*:}"
  [[ "$host" == "$port" ]] && port=3306
  mysqldump -h "$host" -P "$port" -u "$user" -p"$pass" --single-transaction --routines "$db" | gzip > "$FILE"
else
  docker compose exec -T mysql mysqldump -u guntan -pguntan guntan | gzip > "$FILE"
fi

echo "Wrote $FILE"
