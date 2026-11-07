#!/usr/bin/env bash
# Oto İsmail senkronu. Marka marka çalışır, süre dolunca durur ve sonraki çalışmada kaldığı yerden devam eder:
#   */15 * * * *  bash /path/to/guntaneticaret/scripts/otoismail.sh
# Görsel tamamlama (görseli olmayan ürünler için, ayrı cron):
#   5,35 * * * *  bash /path/to/guntaneticaret/scripts/otoismail.sh --images
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/otoismail-$(date +%Y%m).log"

# Cron'da PATH kısıtlıdır; NODE_BIN verilmediyse bilinen yerlere bak.
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
# Barındırma süreç/iş parçacığı sınırı Node'u "Aborted (core dumped)" ile düşürebilir (çıkış kodu 134/139);
# bu durumda bekleyip tek iş parçacığıyla yeniden denenir. Betiğin kendi hataları (çıkış kodu 1) tekrar denenmez.
for attempt in 1 2 3; do
  if (( attempt > 1 )); then
    echo "[$(date -Is)] otoismail çöktü (kod $CODE); ${attempt}. deneme, tek iş parçacığıyla" >> "$LOG"
    sleep 30
    export GOMAXPROCS=1 UV_THREADPOOL_SIZE=1
    POOL=1
  fi
  "$NODE" --v8-pool-size="${POOL:-2}" --import tsx src/otoismail-cli.ts "$@" >> "$LOG" 2>&1
  CODE=$?
  [[ $CODE -ne 134 && $CODE -ne 139 && $CODE -ne 137 ]] && break
done
exit $CODE
