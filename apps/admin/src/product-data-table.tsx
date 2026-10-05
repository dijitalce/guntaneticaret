"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import { IconBox, IconExternal } from "./icons";
import { withBase } from "./paths";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  oems: string[];
  image: string | null;
  manufacturer: string | null;
  supplier: string | null;
  price: string;
  stockQty: number;
  status: string;
  stockStatus: string;
  updatedAt: string;
};

export type SortHeader = { key: string; label: string; href?: string; dir?: "asc" | "desc" | null; num?: boolean; width?: number };

const STATUS_LABEL: Record<string, string> = { active: "Aktif", inactive: "Pasif", draft: "Taslak" };
const STATUS_TONE: Record<string, string> = { active: "ok", inactive: "neutral", draft: "warn" };

type CellState = "idle" | "saving" | "saved" | "error";

async function saveProduct(id: string, patch: Record<string, string>) {
  const body = new FormData();
  for (const [k, v] of Object.entries(patch)) body.set(k, v);
  const res = await fetch(withBase(`/api/products/${id}`), { method: "POST", body, headers: { accept: "application/json" } });
  const data = (await res.json().catch(() => ({}))) as Partial<ProductRow> & { error?: string };
  if (!res.ok) throw new Error(data.error || "Kaydedilemedi");
  return data;
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(
    new Date(iso),
  );
}

function EditableNumber({
  value,
  step,
  suffix,
  onSave,
}: {
  value: string;
  step: string;
  suffix?: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<CellState>("idle");
  const [error, setError] = useState("");

  const commit = async () => {
    if (draft.trim() === "" || Number(draft) === Number(value)) {
      setDraft(value);
      return;
    }
    setState("saving");
    try {
      await onSave(draft);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
      setState("error");
    }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraft(value);
      e.currentTarget.blur();
    }
  };

  return (
    <span className={`dt-edit is-${state}`} title={state === "error" ? error : "Değiştirip Enter'a basın"}>
      <input
        className="dt-edit-input"
        type="number"
        min="0"
        step={step}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (state === "error") setState("idle");
        }}
        onBlur={commit}
        onKeyDown={onKey}
        aria-label={suffix}
      />
      {suffix ? <span className="dt-edit-suffix">{suffix}</span> : null}
    </span>
  );
}

export function ProductDataTable({
  rows: initialRows,
  headers,
  storefrontUrl,
}: {
  rows: ProductRow[];
  headers: SortHeader[];
  storefrontUrl: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastIds, setLastIds] = useState(initialRows.map((r) => r.id).join());

  const ids = initialRows.map((r) => r.id).join();
  if (ids !== lastIds) {
    setLastIds(ids);
    setRows(initialRows);
    setSelected(new Set());
  }

  const patchRow = (id: string, data: Partial<ProductRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = async (status: string) => {
    setBulkMsg(null);
    const list = [...selected];
    const res = await fetch(withBase("/api/products/bulk"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: list, status }),
    });
    const data = (await res.json().catch(() => ({}))) as { updated?: number; error?: string };
    if (!res.ok) {
      setBulkMsg({ tone: "bad", text: data.error || "Toplu işlem başarısız." });
      return;
    }
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
    setSelected(new Set());
    setBulkMsg({ tone: "ok", text: `${data.updated ?? list.length} ürün "${STATUS_LABEL[status]}" yapıldı.` });
    startTransition(() => router.refresh());
  };

  return (
    <>
      {selected.size > 0 ? (
        <div className="dt-bulkbar">
          <strong>{selected.size} ürün seçili</strong>
          <span className="muted text-sm">Yayın durumunu değiştir:</span>
          <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => bulk("active")}>
            Aktif yap
          </button>
          <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => bulk("inactive")}>
            Pasif yap
          </button>
          <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => bulk("draft")}>
            Taslağa al
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(new Set())}>
            Seçimi kaldır
          </button>
        </div>
      ) : null}
      {bulkMsg ? <div className={`dt-flash is-${bulkMsg.tone}`}>{bulkMsg.text}</div> : null}

      <div className="table-wrap">
        <table className="table dt-table">
          <thead>
            <tr>
              <th className="dt-check">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Sayfadaki tüm ürünleri seç" />
              </th>
              {headers.map((h) => (
                <th key={h.key} className={h.num ? "num" : undefined} style={h.width ? { width: h.width } : undefined}>
                  {h.href ? (
                    <Link href={h.href} className={`dt-sort${h.dir ? " is-active" : ""}`}>
                      {h.label}
                      <span aria-hidden>{h.dir === "asc" ? "▲" : h.dir === "desc" ? "▼" : "↕"}</span>
                    </Link>
                  ) : (
                    h.label
                  )}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const oos = p.stockQty <= 0 || p.stockStatus === "out_of_stock";
              return (
                <tr key={p.id} className={selected.has(p.id) ? "is-selected" : undefined}>
                  <td className="dt-check">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`${p.name} seç`} />
                  </td>
                  <td>
                    <div className="item-row">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="item-thumb dt-thumb" src={p.image} alt="" loading="lazy" />
                      ) : (
                        <span className="item-thumb dt-thumb is-empty">
                          <IconBox width={18} height={18} />
                        </span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="dt-name" title={p.name}>
                          {p.name}
                        </div>
                        <span className="sub">
                          <code>{p.sku}</code>
                          {p.oems.length ? ` · OEM ${p.oems.join(", ")}` : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="dt-meta">{p.manufacturer ?? "—"}</div>
                    <span className="sub">{p.supplier ?? "Elle"}</span>
                  </td>
                  <td className="num">
                    <EditableNumber
                      value={p.price}
                      step="0.01"
                      suffix="₺"
                      onSave={async (v) => {
                        const d = await saveProduct(p.id, { price: v });
                        patchRow(p.id, { price: String(d.price), updatedAt: String(d.updatedAt ?? p.updatedAt) });
                      }}
                    />
                  </td>
                  <td className="num">
                    <span className={oos ? "dt-stock is-out" : "dt-stock"}>
                      <EditableNumber
                        value={String(p.stockQty)}
                        step="1"
                        suffix="ad."
                        onSave={async (v) => {
                          const d = await saveProduct(p.id, { stockQty: v });
                          patchRow(p.id, { stockQty: Number(d.stockQty), stockStatus: String(d.stockStatus), updatedAt: String(d.updatedAt ?? p.updatedAt) });
                        }}
                      />
                    </span>
                  </td>
                  <td>
                    <StatusSelect
                      value={p.status}
                      onSave={async (v) => {
                        const d = await saveProduct(p.id, { status: v });
                        patchRow(p.id, { status: String(d.status), updatedAt: String(d.updatedAt ?? p.updatedAt) });
                      }}
                    />
                  </td>
                  <td className="text-sm muted dt-date">{formatDay(p.updatedAt)}</td>
                  <td className="table-actions">
                    <a className="btn btn-ghost btn-xs" href={`${storefrontUrl}/urun/${p.slug}`} target="_blank" rel="noreferrer" title="Sitede aç">
                      <IconExternal width={13} height={13} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusSelect({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [state, setState] = useState<CellState>("idle");
  return (
    <span className={`dt-status tone-${STATUS_TONE[value] ?? "neutral"} is-${state}`}>
      <select
        value={value}
        disabled={state === "saving"}
        aria-label="Yayın durumu"
        onChange={async (e) => {
          setState("saving");
          try {
            await onSave(e.target.value);
            setState("saved");
            setTimeout(() => setState("idle"), 1500);
          } catch {
            setState("error");
          }
        }}
      >
        <option value="active">Aktif</option>
        <option value="inactive">Pasif</option>
        <option value="draft">Taslak</option>
      </select>
    </span>
  );
}
