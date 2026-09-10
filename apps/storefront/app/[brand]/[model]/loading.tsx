export default function BrandLoading() {
  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <span className="skeleton skeleton-line w-40" style={{ display: "inline-block" }} />
      </nav>
      <div className="skeleton-toolbar">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          <span className="skeleton skeleton-line w-40" style={{ height: "1.4rem" }} />
          <span className="skeleton skeleton-line w-60" />
        </div>
        <span className="skeleton skeleton-line" style={{ width: "140px", height: "2.2rem" }} />
      </div>
      <div className="product-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="skeleton-card" key={i}>
            <span className="skeleton skeleton-media" />
            <div className="skeleton-card-body">
              <span className="skeleton skeleton-line w-40" />
              <span className="skeleton skeleton-line w-80" />
              <span className="skeleton skeleton-line w-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
