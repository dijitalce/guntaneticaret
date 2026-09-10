import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "#f6f6f4",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Sayfa bulunamadı</h1>
        <p style={{ lineHeight: 1.55, color: "#444", marginBottom: "1rem" }}>
          İstediğiniz sayfa yok veya henüz oluşturulmamış. Marka / kategori / ürün listeleri boşsa
          sunucuda katalog seed veya XML import gerekir.
        </p>
        <ul style={{ lineHeight: 1.7, color: "#333", paddingLeft: "1.25rem" }}>
          <li>
            <code>pnpm db:sync-catalog</code> — araç markaları
          </li>
          <li>
            <code>pnpm db:seed</code> — demo katalog (boşsa)
          </li>
          <li>
            <code>pnpm import:xml</code> / <code>pnpm import:basbug</code> — gerçek ürünler
          </li>
        </ul>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/" style={{ color: "#0b57d0" }}>
            Anasayfaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}
