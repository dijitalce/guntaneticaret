#!/usr/bin/env bash
# Cron: */15 * * * *  bash /path/to/guntaneticaret/scripts/otoparcasan-images.sh
# Her çalışma en fazla 14 dk sürer, kilit dosyası sayesinde üst üste binmez.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/otoparcasan-images-$(date +%Y%m).log"

# Cron'da PATH kısıtlıdır; NODE_BIN verilmediyse bilinen yerlere bak.
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

export GOMAXPROCS="${GOMAXPROCS:-2}" UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"

START=$(date +%s)
cd "$ROOT/packages/import"

# Saatte bir (saatin ilk çeyreğindeki çalışma): değişen adresleri IndexNow ile Bing/Yandex'e bildir.
if (( 10#$(date +%M) < 15 )); then
  timeout 300 "$NODE" --v8-pool-size=1 --import tsx src/indexnow-cli.ts >> "$ROOT/logs/indexnow-$(date +%Y%m).log" 2>&1
fi

"$NODE" --v8-pool-size=2 --import tsx src/otoparcasan-images-cli.ts "$@" >> "$LOG" 2>&1

# otoparcasan sırası boşaldığında çalışma birkaç saniyede biter; kalan süre parcatedarik'e verilir.
# Hostinger cron süreçlerini ~16 dk'da öldürdüğü için toplam 14 dk'yı geçmemeli.
LEFT=$(( 14 - ($(date +%s) - START) / 60 - 1 ))
if (( LEFT >= 3 )); then
  NODE_BIN="$NODE" PARCATEDARIK_MAX_MINUTES="$LEFT" bash "$ROOT/scripts/parcatedarik-images.sh"
fi
