"use client";

import { useMemo, useState } from "react";

type Row = { key: number; below: string; percent: string; selected: boolean };
export type TierInput = { below: number | null; percent: number };

const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);
const num = (s: string) => Number(String(s).replace(",", "."));
const round2 = (n: number) => Math.round(n * 100) / 100;

let seq = 0;
function toRows(tiers: TierInput[]): Row[] {
  return tiers.map((t) => ({ key: ++seq, below: t.below == null ? "" : String(t.below), percent: String(t.percent), selected: false }));
}

export function PriceTierEditor({
  initial,
  saved,
  counts,
  disabled,
  action,
}: {
  action: string;
  initial: TierInput[];
  saved: TierInput[];
  counts: number[];
  disabled?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [mode, setMode] = useState<"points" | "ratio" | "set">("points");
  const [amount, setAmount] = useState("5");
  const [target, setTarget] = useState<"all" | "selected">("all");

  const tiers: TierInput[] = rows.map((r, i) => ({
    below: i === rows.length - 1 ? null : num(r.below),
    percent: num(r.percent),
  }));

  const error = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i]!;
      if (!Number.isFinite(t.percent) || t.percent < 0 || t.percent > 500) return `${i + 1}. dilimin oranı 0–500 arasında olmalı.`;
      if (i < tiers.length - 1) {
        if (!Number.isFinite(t.below!) || t.below! <= 0) return `${i + 1}. dilimin üst sınırını girin.`;
        if (i > 0 && t.below! <= tiers[i - 1]!.below!) return "Üst sınırlar artan sırada olmalı.";
      }
    }
    return null;
  }, [tiers]);

  const dirty =
    tiers.length !== saved.length || tiers.some((t, i) => t.percent !== saved[i]!.percent || t.below !== saved[i]!.below);
  const selectedCount = rows.filter((r) => r.selected).length;
  const boundsSame = tiers.length === saved.length && tiers.every((t, i) => t.below === saved[i]!.below);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const applyBulk = () => {
    const v = num(amount);
    if (!Number.isFinite(v)) return;
    setRows((rs) =>
      rs.map((r) => {
        if (target === "selected" && !r.selected) return r;
        const p = num(r.percent);
        const next = mode === "points" ? p + v : mode === "ratio" ? p * (1 + v / 100) : v;
        return { ...r, percent: String(Math.max(0, round2(next))) };
      }),
    );
  };

  const addRow = () =>
    setRows((rs) => {
      const lastBound = rs.length > 1 ? num(rs[rs.length - 2]!.below) : 0;
      const newBound = lastBound > 0 ? lastBound * 2 : 1000;
      const last = rs[rs.length - 1]!;
      return [...rs.slice(0, -1), { ...last, below: String(newBound), key: ++seq }, { key: ++seq, below: "", percent: last.percent, selected: false }];
    });

  const removeRow = (key: number) => setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.key !== key)));

  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "now" && !confirm("Tüm tedarikçi ürünlerinin satış fiyatları yeni oranlarla şimdi güncellenecek. Devam edilsin mi?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

      <div className="bulk-bar">
        <strong>Toplu değişiklik</strong>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} aria-label="Değişiklik türü">
          <option value="points">Oranlara puan ekle / çıkar</option>
          <option value="ratio">Oranları yüzde olarak artır / azalt</option>
          <option value="set">Oranları sabit değere eşitle</option>
        </select>
        <div className="bulk-amount">
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Değer"
          />
          <span>{mode === "points" ? "puan" : "%"}</span>
        </div>
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value as typeof target)} aria-label="Uygulanacak dilimler">
          <option value="all">Tüm dilimlere</option>
          <option value="selected">Seçili dilimlere ({selectedCount})</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={applyBulk} disabled={target === "selected" && selectedCount === 0}>
          Uygula
        </button>
        <small className="muted">
          {mode === "points"
            ? "Örn. 5 → %30 olan dilim %35 olur. Azaltmak için −5 yazın."
            : mode === "ratio"
              ? "Örn. 10 → %30 olan dilim %33 olur."
              : "Seçilen dilimlerin hepsi aynı orana ayarlanır."}
        </small>
      </div>

      <div className="table-wrap">
        <table className="table tier-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={selectedCount === rows.length}
                  onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, selected: e.target.checked })))}
                />
              </th>
              <th>Maliyet aralığı (TL)</th>
              <th>Marj</th>
              <th>Örnek</th>
              <th className="num">Ürün</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const from = i === 0 ? 0 : num(rows[i - 1]!.below);
              const last = i === rows.length - 1;
              const pct = num(r.percent);
              const before = saved[i];
              const changed = !before || before.percent !== pct;
              const sampleCost = last ? (Number.isFinite(from) && from > 0 ? from * 1.5 : 1000) : num(r.below);
              return (
                <tr key={r.key} className={r.selected ? "is-selected" : undefined}>
                  <td>
                    <input type="checkbox" checked={r.selected} onChange={(e) => update(r.key, { selected: e.target.checked })} aria-label={`${i + 1}. dilimi seç`} />
                  </td>
                  <td>
                    <div className="tier-range">
                      <span>{Number.isFinite(from) ? from.toLocaleString("tr-TR") : "—"}</span>
                      <span className="muted">–</span>
                      {last ? (
                        <span className="muted">ve üzeri</span>
                      ) : (
                        <input
                          className="input"
                          inputMode="decimal"
                          value={r.below}
                          onChange={(e) => update(r.key, { below: e.target.value })}
                          aria-label={`${i + 1}. dilim üst sınır`}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="tier-pct">
                      <span>%</span>
                      <input
                        className="input"
                        inputMode="decimal"
                        value={r.percent}
                        onChange={(e) => update(r.key, { percent: e.target.value })}
                        aria-label={`${i + 1}. dilim marj`}
                      />
                      {changed && before ? (
                        <em className={pct > before.percent ? "is-up" : "is-down"}>
                          {pct > before.percent ? "▲" : "▼"} %{before.percent}
                        </em>
                      ) : null}
                    </div>
                  </td>
                  <td className="muted text-sm">
                    {Number.isFinite(sampleCost) && Number.isFinite(pct)
                      ? `${tl(sampleCost)} → ${tl(round2(sampleCost * (1 + pct / 100)))}`
                      : "—"}
                  </td>
                  <td className="num">{boundsSame && counts[i] != null ? counts[i]!.toLocaleString("tr-TR") : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeRow(r.key)}
                      disabled={rows.length <= 1}
                      aria-label={`${i + 1}. dilimi sil`}
                      title="Dilimi sil"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="tier-footer">
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow} disabled={rows.length >= 12}>
          + Dilim ekle
        </button>
        <div className="row-actions" style={{ alignItems: "center" }}>
          {error ? <span className="text-sm" style={{ color: "var(--a-bad)" }}>{error}</span> : null}
          {dirty ? (
            <button type="button" className="btn btn-ghost" onClick={() => setRows(toRows(saved))}>
              Geri al
            </button>
          ) : null}
          <button className="btn btn-secondary" type="submit" name="apply" value="later" disabled={!!error || disabled}>
            Kaydet
          </button>
          <button className="btn btn-primary" type="submit" name="apply" value="now" disabled={!!error || disabled}>
            Kaydet ve fiyatları şimdi güncelle
          </button>
        </div>
      </div>
    </form>
  );
}
