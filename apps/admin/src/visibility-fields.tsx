"use client";

import { useMemo, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { BrandPicker, type PickerBrand } from "./brand-picker";

export type PickerGroup = { id: string; name: string; memberIds: string[] };

export function VisibilityFields({
  mode,
  groups,
  brands,
  selectedGroups,
  includeBrands,
  excludeBrands,
}: {
  mode: "ALL" | "SELECTED";
  groups: PickerGroup[];
  brands: PickerBrand[];
  selectedGroups: string[];
  includeBrands: string[];
  excludeBrands: string[];
}) {
  const [scope, setScope] = useState(mode);
  const [g, setG] = useState(() => new Set(selectedGroups));
  const [inc, setInc] = useState(includeBrands);
  const [exc, setExc] = useState(excludeBrands);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const visibleCount = useMemo(() => {
    if (scope === "ALL") return brands.length;
    const set = new Set<string>();
    for (const grp of groups) if (g.has(grp.id)) grp.memberIds.forEach((id) => set.add(id));
    inc.forEach((id) => set.add(id));
    exc.forEach((id) => set.delete(id));
    return set.size;
  }, [scope, groups, g, inc, exc, brands.length]);

  const toggleGroup = (id: string) =>
    setG((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="form-stack">
      <input type="hidden" name="visibilityScope" value={scope} />
      <div className="choice-grid">
        <button type="button" className={`choice-card${scope === "ALL" ? " is-on" : ""}`} onClick={() => setScope("ALL")} aria-pressed={scope === "ALL"}>
          <strong>Tüm katalog</strong>
          <span>Bütün markalar ve aktif ürünler bu sitede görünür. Ana site için önerilir.</span>
        </button>
        <button
          type="button"
          className={`choice-card${scope === "SELECTED" ? " is-on" : ""}`}
          onClick={() => setScope("SELECTED")}
          aria-pressed={scope === "SELECTED"}
        >
          <strong>Seçili markalar</strong>
          <span>Marka grupları ve tek tek seçilen markalar. Niş siteler (örn. sadece Renault) için.</span>
        </button>
      </div>

      <div className={`visibility-summary is-${scope === "SELECTED" && visibleCount === 0 ? "bad" : "ok"}`}>
        <strong>{visibleCount.toLocaleString("tr-TR")}</strong> marka bu sitede görünecek
        {scope === "SELECTED" && visibleCount === 0 ? " — en az bir grup veya marka seçin, yoksa katalog boş kalır." : "."}
      </div>

      <div hidden={scope !== "SELECTED"} className="form-stack">
        <div className="field">
          <label>Marka grupları</label>
          {groups.length === 0 ? (
            <p className="muted text-sm" style={{ margin: 0 }}>
              Henüz marka grubu yok. Katalog → Marka grupları bölümünden oluşturabilirsiniz.
            </p>
          ) : (
            <div className="group-pick-grid">
              {groups.map((grp) => {
                const on = g.has(grp.id);
                const logos = grp.memberIds.map((id) => brandById.get(id)).filter((b): b is PickerBrand => !!b);
                return (
                  <label key={grp.id} className={`group-pick${on ? " is-on" : ""}`}>
                    <input type="checkbox" name="groupIds" value={grp.id} checked={on} onChange={() => toggleGroup(grp.id)} />
                    <span className="group-pick-head">
                      <strong>{grp.name}</strong>
                      <small>{grp.memberIds.length} marka</small>
                    </span>
                    <span className="logo-stack">
                      {logos.slice(0, 7).map((b) => (
                        <BrandLogo key={b.id} src={b.logo} name={b.name} size={26} />
                      ))}
                      {logos.length > 7 ? <span className="logo-more is-sm">+{logos.length - 7}</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="field">
          <label>Ek markalar</label>
          <small className="field-hint">Gruplara ek olarak tek tek eklemek istediğiniz markalar.</small>
          <BrandPicker brands={brands} selected={includeBrands} name="includeBrandIds" onChange={setInc} emptyText="Ek marka seçilmedi." />
        </div>

        <details className="field details-block" open={excludeBrands.length > 0}>
          <summary>
            Hariç tutulan markalar <span className="badge badge-neutral is-plain">{exc.length}</span>
          </summary>
          <small className="field-hint">Seçili gruplarda olsa bile bu sitede gösterilmeyecek markalar.</small>
          <BrandPicker brands={brands} selected={excludeBrands} name="excludeBrandIds" onChange={setExc} emptyText="Hariç tutulan marka yok." />
        </details>
      </div>
    </div>
  );
}
