#!/usr/bin/env bash
# Sunucuda MariaDB yükünü teşhis eder (salt okunur). Çıktıyı paylaşın:
#   bash scripts/db-diagnose.sh > /tmp/guntan-diag.txt 2>&1
# Gerekirse: MYSQL="mysql -u root -p..." bash scripts/db-diagnose.sh
set -uo pipefail
MYSQL="${MYSQL:-mysql}"
q() { echo; echo "=== $1 ==="; shift; $MYSQL -e "$@" 2>&1; }

echo "Tarih: $(date -Is)"
q "Sürüm / bellek ayarları" "SELECT @@version v, @@innodb_buffer_pool_size/1024/1024 pool_mb, @@tmp_table_size/1024/1024 tmp_mb, @@max_heap_table_size/1024/1024 heap_mb, @@join_buffer_size/1024 join_kb, @@max_connections maxconn;"
q "Şu an çalışan sorgular (>2 sn)" "SELECT id, time, state, LEFT(info,700) q FROM information_schema.processlist WHERE command='Query' AND time>2 ORDER BY time DESC;"
q "Bağlantı sayısı" "SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Created_tmp_disk_tables','Created_tmp_tables','Select_full_join','Slow_queries','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_requests');"
q "Buffer pool isabet oranı (%)" "SELECT ROUND(100*(1-(SELECT variable_value FROM information_schema.global_status WHERE variable_name='Innodb_buffer_pool_reads')/(SELECT variable_value FROM information_schema.global_status WHERE variable_name='Innodb_buffer_pool_read_requests')),3) hit_pct;"
q "En büyük tablolar (MB)" "SELECT table_name, ROUND((data_length+index_length)/1024/1024) mb, table_rows FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY (data_length+index_length) DESC LIMIT 10;"

echo; echo "=== Bellek (free -m) ==="; free -m 2>&1
echo; echo "=== En çok bellek/CPU kullanan süreçler ==="; ps -eo pid,pcpu,pmem,rss,comm --sort=-rss 2>/dev/null | head -12
echo; echo "=== OOM kayıtları ==="; dmesg -T 2>/dev/null | grep -i -E "killed process|out of memory" | tail -5 || true

SLOW="${SLOW_LOG:-/var/log/mysql/slow.log}"
if [[ -r "$SLOW" ]] && command -v mysqldumpslow >/dev/null 2>&1; then
  echo; echo "=== Toplam süreye göre ilk 10 yavaş sorgu ($SLOW) ==="
  mysqldumpslow -s t -t 10 -a "$SLOW" 2>&1 | cut -c1-600
fi
