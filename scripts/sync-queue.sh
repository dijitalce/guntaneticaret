#!/usr/bin/env bash
# Tedarikçi senkronu kuyruğu. Cron (dakikada bir):
#   * * * * *  bash /path/to/guntaneticaret/scripts/sync-queue.sh
#
# 1. Panelin bıraktığı isteği (guntan-sync-request) alır ve senkronu başlatır. Senkron böylece web
#    sürecinin altında çalışmaz; site yeniden başladığında öldürülmez.
# 2. İstek yoksa, paneldeki saatlerde (guntan-sync-hours, Türkiye saati; yoksa 6,18) zamanlanmış
#    senkronu başlatır. Barındırma süreç sınırı yüzünden başlayamazsa bir sonraki dakika yeniden dener.
# Bu cron varken ayrıca supplier-sync.sh için cron tanımlamayın.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Panel (admin) ile aynı klasör: guntan-sync.env'in bulunduğu yer (bkz. packages/import/src/sync-env.ts).
SYNC_DIR=""
if [[ -n "${SYNC_ENV_FILE:-}" && -f "$SYNC_ENV_FILE" ]]; then
  SYNC_DIR="$(dirname "$SYNC_ENV_FILE")"
else
  DIR="$(dirname "$ROOT")"
  for _ in 1 2 3 4 5 6 7 8; do
    if [[ -f "$DIR/guntan-sync.env" ]]; then SYNC_DIR="$DIR"; break; fi
    PARENT="$(dirname "$DIR")"
    [[ "$PARENT" == "$DIR" ]] && break
    DIR="$PARENT"
  done
fi
SYNC_DIR="${SYNC_DIR:-$HOME}"

# Panel bu dosyanın tazeliğine bakarak kuyruğun kurulu olduğunu anlar.
touch "$SYNC_DIR/guntan-sync-queue.seen" 2>/dev/null || true

LOG="$SYNC_DIR/guntan-sync.log"
note() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG"; }

# Çalışan senkron varsa istek bekler (sync-lock.ts: kalp atışı 1 dk, 10 dk sessizse ölü sayılır).
LOCK="${TMPDIR:-/tmp}/guntan-supplier-sync.lock"
if [[ -f "$LOCK" ]] && (( $(date +%s) - $(stat -c %Y "$LOCK") < 600 )); then
  exit 0
fi

REQ="$SYNC_DIR/guntan-sync-request"
TRIGGER=""
FLAGS=""
if [[ -f "$REQ" ]]; then
  mv -f "$REQ" "$REQ.taken" 2>/dev/null || exit 0
  { IFS= read -r TRIGGER || true; IFS= read -r FLAGS || true; } < "$REQ.taken"
  rm -f "$REQ.taken"
  if [[ ! "$FLAGS" =~ ^(\ |--skip-fetch|--feed=[A-Za-z0-9_-]+)*$ ]]; then
    note "Kuyruk: geçersiz istek yok sayıldı."
    exit 0
  fi
  TRIGGER="${TRIGGER:-panel}"
else
  HOURS="$(tr -cd '0-9,' < "$SYNC_DIR/guntan-sync-hours" 2>/dev/null || true)"
  HOURS="${HOURS:-6,18}"
  HOUR="$(TZ=Europe/Istanbul date +%-H)"
  [[ ",$HOURS," == *",$HOUR,"* ]] || exit 0
  SLOT="$(TZ=Europe/Istanbul date +%Y-%m-%d-%H)"
  STAMP="$SYNC_DIR/guntan-sync-last-scheduled"
  [[ "$(cat "$STAMP" 2>/dev/null)" == "$SLOT" ]] && exit 0
  echo "$SLOT" > "$STAMP"
  TRIGGER="cron"
fi

note "Kuyruk: senkron başlatılıyor ($TRIGGER${FLAGS:+, $FLAGS})."
export SYNC_TRIGGER="$TRIGGER"
# shellcheck disable=SC2086 # bayraklar yukarıda doğrulandı, kelimelere bölünmesi isteniyor
exec bash "$ROOT/scripts/supplier-sync.sh" $FLAGS
