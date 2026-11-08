/**
 * Site araması için tam metin (FULLTEXT) indeksli ayrı arama tablosu.
 *
 * Yedek SQL araması 1,4 milyon üründe `name LIKE '%…%'` taraması yapıyordu (sorgu başına 10-25 sn,
 * Hostinger "kötüye kullanım" raporlarının tamamı). FULLTEXT indeksi doğrudan `products`'a eklemek
 * tabloyu yeniden yazdığı için geçici olarak veritabanı kotasını aşabilir; bunun yerine yalnızca
 * id/ad/stok kodu tutan küçük bir tablo kullanılır. Tablo tetikleyicilerle güncel kalır:
 * ürün eklenince satır eklenir, adı/stok kodu değişince güncellenir, ürün silinince FK ile silinir.
 *
 * Tekrar çalıştırılması güvenlidir: pnpm db:ensure-product-search
 */
import mysql from "mysql2/promise";
import { mysqlConnectOptions } from "./mysql-options";

const url = process.env.DATABASE_URL ?? "mysql://guntan:guntan@localhost:3306/guntan";
const pool = mysql.createPool({ ...mysqlConnectOptions(url, { connectionLimit: 1 }) });
const BATCH = 50_000;

async function q(sql: string, params: unknown[] = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Barındırmadaki 180 sn sorgu sınırı doldurma ve indeks adımlarını kesmesin.
await q("SET SESSION max_statement_time = 0");

await q(`CREATE TABLE IF NOT EXISTS product_search (
  product_id char(36) NOT NULL,
  name varchar(512) NOT NULL,
  sku varchar(191) NOT NULL,
  PRIMARY KEY (product_id),
  CONSTRAINT product_search_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
console.log("table ok");

// Tetikleyiciler doldurmadan önce kurulur ki bu sırada değişen ürünler kaçmasın.
await q("DROP TRIGGER IF EXISTS products_search_ai");
await q(`CREATE TRIGGER products_search_ai AFTER INSERT ON products FOR EACH ROW
  INSERT INTO product_search (product_id, name, sku) VALUES (NEW.id, NEW.name, NEW.sku)
  ON DUPLICATE KEY UPDATE name = NEW.name, sku = NEW.sku`);
await q("DROP TRIGGER IF EXISTS products_search_au");
await q(`CREATE TRIGGER products_search_au AFTER UPDATE ON products FOR EACH ROW
  IF NEW.name <> OLD.name OR NEW.sku <> OLD.sku THEN
    INSERT INTO product_search (product_id, name, sku) VALUES (NEW.id, NEW.name, NEW.sku)
    ON DUPLICATE KEY UPDATE name = NEW.name, sku = NEW.sku;
  END IF`);
console.log("triggers ok");

// Mevcut ürünler id sırasıyla parça parça kopyalanır (eksik veya farklı olanlar).
let after = "";
let copied = 0;
for (;;) {
  const ids = (await q("SELECT id FROM products WHERE id > ? ORDER BY id LIMIT 1 OFFSET ?", [after, BATCH - 1])) as { id: string }[];
  const upto = ids[0]?.id ?? null;
  const res = (await q(
    `INSERT INTO product_search (product_id, name, sku)
       SELECT id, name, sku FROM products WHERE id > ? ${upto ? "AND id <= ?" : ""}
     ON DUPLICATE KEY UPDATE name = VALUES(name), sku = VALUES(sku)`,
    upto ? [after, upto] : [after],
  )) as { affectedRows: number };
  copied += res.affectedRows;
  if (!upto) break;
  after = upto;
  console.log(`copied up to ${after.slice(0, 8)}… (${copied})`);
}
console.log(`backfill ok (${copied} rows affected)`);

const [hasFt] = (await q(
  `SELECT COUNT(*) n FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'product_search' AND index_name = 'product_search_ft'`,
)) as { n: number }[];
if (Number(hasFt?.n) === 0) {
  // Türkçe sözcükler (ör. "de") İngilizce yok sayılan kelime listesine takılmasın.
  await q("SET SESSION innodb_ft_enable_stopword = OFF");
  await q("ALTER TABLE product_search ADD FULLTEXT INDEX product_search_ft (name, sku)");
  console.log("fulltext index created");
} else {
  console.log("fulltext index exists");
}

await pool.end();
console.log("Product search table ensured.");
