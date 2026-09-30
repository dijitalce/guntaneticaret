#!/usr/bin/env bash
# Cron (saatte bir): 15 * * * *  /path/to/guntaneticaret/scripts/shipment-sync.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/shipment-sync-$(date +%Y%m).log"

NODE="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE" ]]; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin/node /opt/alt/alt-nodejs*/root/usr/bin/node /usr/local/bin/node; do
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

# Barındırma süreç sınırı iş parçacıklarını da sayar; esbuild (Go) varsayılan olarak çekirdek sayısı kadar açar.
export GOMAXPROCS="${GOMAXPROCS:-2}" UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"

cd "$ROOT/packages/import"
"$NODE" --v8-pool-size=2 --import tsx src/shipment-sync-cli.ts "$@" >> "$LOG" 2>&1
