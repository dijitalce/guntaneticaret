#!/usr/bin/env bash
# Katalog facet snapshot’larını doldurur (MariaDB’yi istek yolundan ayırır).
# Cron (gece veya düşük trafikte, örn. saatte bir): 
#   20 * * * * bash /path/to/guntaneticaret/scripts/refresh-facets.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/refresh-facets-$(date +%Y%m).log"

NODE="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE" ]]; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin/node /opt/alt/alt-nodejs*/root/usr/bin/node /opt/alt/alt-nodejs*/root/bin/node /usr/local/bin/node; do
    [[ -x "$candidate" ]] && NODE="$candidate"
  done
fi
if [[ -z "$NODE" ]]; then
  echo "[$(date -Is)] node bulunamadı; NODE_BIN=/path/to/node ile çalıştırın" >> "$LOG"
  exit 1
fi

if ESB="$("$NODE" "$ROOT/scripts/ensure-esbuild.cjs" 2>>"$LOG")" && [[ -n "$ESB" ]]; then
  export ESBUILD_BINARY_PATH="$ESB"
fi

export GOMAXPROCS="${GOMAXPROCS:-1}" UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-1}"

# tsx @guntan/import bağımlılığında (catalog'a eklenmedi — lockfile şişmesin / frozen-lockfile kırılmasın).
cd "$ROOT/packages/import"
"$NODE" --v8-pool-size=1 --max-old-space-size=1024 --import tsx ../catalog/src/refresh-facets-cli.ts "$@" >> "$LOG" 2>&1
