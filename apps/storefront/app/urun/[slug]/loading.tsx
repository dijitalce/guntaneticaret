export default function ProductLoading() {
  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <span className="skeleton skeleton-line w-60" style={{ display: "inline-block" }} />
      </nav>
      <div className="skeleton-pdp">
        <span className="skeleton skeleton-media" />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          <span className="skeleton skeleton-line w-40" />
          <span className="skeleton skeleton-line w-80" style={{ height: "1.6rem" }} />
          <span className="skeleton skeleton-line w-60" />
          <span className="skeleton skeleton-line w-40" style={{ height: "1.4rem" }} />
          <span className="skeleton skeleton-line" style={{ width: "160px", height: "2.4rem", marginTop: "0.5rem" }} />
        </div>
      </div>
    </div>
  );
}
