"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; slug: string };

export function CategoryVehicleFinder({
  brands,
  initialBrandSlug,
  initialModelSlug,
}: {
  brands: Brand[];
  initialBrandSlug?: string;
  initialModelSlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState(initialBrandSlug ?? "");
  const [model, setModel] = useState(initialModelSlug ?? "");
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setBrand(initialBrandSlug ?? ""), [initialBrandSlug]);
  useEffect(() => setModel(initialModelSlug ?? ""), [initialModelSlug]);

  useEffect(() => {
    if (!brand) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/models?brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setModels(data.models ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brand]);

  function navigate(nextBrand: string, nextModel: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (nextBrand) params.set("brand", nextBrand);
    else params.delete("brand");
    if (nextModel) params.set("model", nextModel);
    else params.delete("model");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  function onBrandChange(next: string) {
    setBrand(next);
    setModel("");
    navigate(next, "");
  }

  function onModelChange(next: string) {
    setModel(next);
    navigate(brand, next);
  }

  return (
    <div className="category-finder">
      <p className="category-finder-label">Aracına uygun parçalar için marka ve model seç</p>
      <div className="category-finder-controls">
        <label>
          Marka
          <select className="select" value={brand} onChange={(e) => onBrandChange(e.target.value)}>
            <option value="">Tüm markalar</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Model
          <select
            className="select"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={!brand || loading}
          >
            <option value="">{loading ? "Yükleniyor…" : brand ? "Tüm modeller" : "Önce marka seç"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        {(brand || model) && (
          <button
            type="button"
            className="btn btn-ghost category-finder-clear"
            onClick={() => {
              setBrand("");
              setModel("");
              navigate("", "");
            }}
          >
            Temizle
          </button>
        )}
      </div>
    </div>
  );
}
