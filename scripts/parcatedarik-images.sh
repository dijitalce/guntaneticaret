#!/usr/bin/env bash
# otoparcasan-images.sh kalan süreyle bunu çağırır; elle de çalıştırılabilir:
#   bash /path/to/guntaneticaret/scripts/parcatedarik-images.sh [--recrawl] [--limit=N]
# Kilit dosyası sayesinde üst üste binmez.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/parcatedarik-images-$(date +%Y%m).log"

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

# Hesap thread sınırına yakın çalışıyor; 2 thread'le node açılışta çökebiliyor.
export GOMAXPROCS="${GOMAXPROCS:-1}" UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-1}"

cd "$ROOT/packages/import"
"$NODE" --v8-pool-size=1 --max-old-space-size=1024 --import tsx src/parcatedarik-images-cli.ts "$@" >> "$LOG" 2>&1
