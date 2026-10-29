export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Yükleniyor">
      <div className="skeleton sk-title" />
      <div className="skeleton-kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton sk-kpi" />
        ))}
      </div>
      <div className="skeleton sk-panel" />
    </div>
  );
}
