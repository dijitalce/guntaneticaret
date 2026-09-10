"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 520, margin: "4rem auto", padding: "0 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Bir hata oluştu</h1>
      <p style={{ color: "#555", lineHeight: 1.5 }}>
        Sayfa yüklenirken sunucu hatası alındı. Veritabanı bağlantısı veya yapılandırma eksik olabilir.
      </p>
      {error.digest ? (
        <p style={{ color: "#888", fontSize: "0.85rem" }}>Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: "1.25rem",
          padding: "0.6rem 1rem",
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "#111",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Tekrar dene
      </button>
    </main>
  );
}
