"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
      <h2 style={{ margin: "0 0 0.4rem" }}>Sayfa yüklenemedi</h2>
      <p className="muted" style={{ margin: "0 0 1rem" }}>
        Beklenmeyen bir sorun oluştu. Tekrar deneyin; sürerse sistem günlüğüne bakın.
      </p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Tekrar dene
      </button>
    </div>
  );
}
