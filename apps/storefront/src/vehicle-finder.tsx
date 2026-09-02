"use client";

import { useEffect, useState } from "react";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; slug: string };

export function VehicleFinder({ brands, compact = false }: { brands: Brand[]; compact?: boolean }) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setModel("");
    if (!brand) {
      setModels([]);
      return;
    }
    setLoading(true);
    fetch(`/api/models?brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []))
      .finally(() => setLoading(false));
  }, [brand]);

  const action = model ? `/${brand}/${model}` : brand ? `/${brand}` : "/";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (brand && model) window.location.assign(`/${brand}/${model}`);
    else if (brand) window.location.assign(`/${brand}`);
  }

  return (
    <section className={compact ? "finder-card is-compact" : "finder-card"}>
      <p className="finder-kicker">Hızlı eşleşme</p>
      <h1>Aracına uygun parçayı bul</h1>
      <p className="finder-lead">Marka ve model seç; stoktaki uyumlu parçalar hemen listelenir.</p>
      <ol className="finder-steps" aria-hidden>
        <li className={brand ? "is-done" : "is-current"}>Marka</li>
        <li className={model ? "is-done" : brand ? "is-current" : ""}>Model</li>
        <li className={model ? "is-current" : ""}>Parçalar</li>
      </ol>
      <form className="finder-form" action={action} method="get" onSubmit={onSubmit}>
        <label>
          Marka
          <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)} required>
            <option value="">Marka seç</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </label>
        <label>
          Model
          <select className="select" value={model} onChange={(e) => setModel(e.target.value)} disabled={!brand || loading}>
            <option value="">{loading ? "Yükleniyor…" : brand ? "Model seç" : "Önce marka seç"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.slug}>{m.name}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary finder-submit" type="submit" disabled={!brand}>
          Parçaları göster
        </button>
      </form>
    </section>
  );
}
