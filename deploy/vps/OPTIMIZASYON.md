# Sunucu kaynak kontrol listesi (CPU / RAM / MariaDB)

Önce ölçün: `bash scripts/db-diagnose.sh > /tmp/guntan-diag.txt 2>&1` (salt okunur). Her adımdan sonra tekrar çalıştırıp karşılaştırın.

## 1. Hostinger
- [ ] CPU steal için destek talebi açıldı (`top`/`vmstat` içindeki `st` değeri, tarih aralığı ve CPU uyarı sayılarıyla).

## 2. MariaDB (VPSCE panel → Veritabanları → motor ayarları)
Aktif dosya `/etc/mysql/mariadb.conf.d/90-vpsce.cnf` panel tarafından yönetilir; elle düzenleme ezilir.
- [ ] `bufferPoolMb`: 3072 → **4608–5120** ile başla. 7 GB bu sunucuda OOM riski (15 uygulama, ClamAV, mail). 
      Karar için `free -m` ve `db-diagnose.sh` "Buffer pool isabet oranı" çıktısına bakın; >%99,5 ise artırmaya gerek yok.
- [ ] `tmp_table_size` / `max_heap_table_size`: 32M → **128M–256M** (panel kodunda `mariadbCnf()`; panel deposunda değişmeli).
      Amaç: `Created_tmp_disk_tables` (10 milyon) düşsün.
- [ ] `join_buffer_size` 256K → 1–2M (küçük artış; bağlantı başına bellek harcar, 200 bağlantıyla çarpın).
- [ ] `vm.swappiness` zaten 10; asıl çözüm bellek payı.

## 3. Build / deploy
- [ ] Build'i boş bellekte çalıştırın (cron'lar durdurulmuş), OOM için: `dmesg -T | grep -i -E "killed process|out of memory"`.
- [ ] `NEXT_BUILD_CPUS=1` kalsın; gerekirse `NODE_OPTIONS=--max-old-space-size=2048`.

## 4. Cron'lar
- [ ] `scripts/refresh-facets.sh`, `scripts/sync-queue.sh` güncel sürümle çalışıyor (gündüz 09–22 TR atlanır, kilitli).
- [ ] Gece görsel indirme ve B2B senkronları 22:00–09:00 aralığında.

## 5. Doğrulama (her değişiklikten sonra)
- Yavaş sorgu sayısı/saat, `Threads_running`, MariaDB ve node CPU %, ana sayfa/kategori/ürün TTFB.
