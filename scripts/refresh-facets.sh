#!/usr/bin/env bash
# Katalog facet snapshot’larını doldurur (MariaDB’yi istek yolundan ayırır).
# Cron (gece veya düşük trafikte, örn. saatte bir): 
#   Gündüz (09–22 TR) kendiliğinden atlanır; elle: FACET_ALLOW_DAYTIME=1
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

# Aynı anda tek facet çalışması (saatlik cron önceki bitmeden başlamasın).
LOCKFILE="${TMPDIR:-/tmp}/guntan-refresh-facets.lock"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCKFILE"
  if ! flock -n 9; then
    echo "[$(date -Is)] facets: önceki çalışma sürüyor, atlandı." >> "$LOG"
    exit 0
  fi
fi

# Tedarikçi senkronu çalışırken DB'yi ikinci kez yorma (sync-lock.ts: 10 dk sessizse ölü).
SYNC_LOCK="${TMPDIR:-/tmp}/guntan-supplier-sync.lock"
if [[ -f "$SYNC_LOCK" ]] && (( $(date +%s) - $(stat -c %Y "$SYNC_LOCK" 2>/dev/null || echo 0) < 600 )); then
  echo "[$(date -Is)] facets: senkron çalışıyor, atlandı." >> "$LOG"
  exit 0
fi

# Gündüz (TR 09–22) atla: siteyle DB'yi yarıştırmasın. Elle çalıştırmak için FACET_ALLOW_DAYTIME=1.
HOUR_NOW="$(TZ=Europe/Istanbul date +%-H)"
if [[ "${FACET_ALLOW_DAYTIME:-0}" != "1" ]] && (( 10#$HOUR_NOW >= 9 && 10#$HOUR_NOW < 22 )); then
  exit 0
fi

# CPU/disk önceliğini düşür: site istekleri her zaman önde.
PRIO=()
command -v nice >/dev/null 2>&1 && PRIO+=(nice -n 15)
command -v ionice >/dev/null 2>&1 && PRIO+=(ionice -c 3)

export GOMAXPROCS="${GOMAXPROCS:-1}" UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-1}"

# tsx @guntan/import bağımlılığında (catalog'a eklenmedi — lockfile şişmesin / frozen-lockfile kırılmasın).
cd "$ROOT/packages/import"
${PRIO[@]+"${PRIO[@]}"} "$NODE" --v8-pool-size=1 --max-old-space-size=1024 --import tsx ../catalog/src/refresh-facets-cli.ts "$@" >> "$LOG" 2>&1
