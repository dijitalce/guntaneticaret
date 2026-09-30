import Link from "next/link";
import type { ReactNode } from "react";

export function pageNumber(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function buildHref(base: string, params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

export function Pager({
  base,
  page,
  total,
  perPage,
  params = {},
}: {
  base: string;
  page: number;
  total: number;
  perPage: number;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="pager">
      <span className="muted text-sm">
        {from.toLocaleString("tr-TR")}–{to.toLocaleString("tr-TR")} / {total.toLocaleString("tr-TR")}
      </span>
      <div className="pager-links">
        {page > 1 ? (
          <Link className="btn btn-secondary btn-sm" href={buildHref(base, { ...params, sayfa: page - 1 })}>
            Önceki
          </Link>
        ) : null}
        <span className="text-sm">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link className="btn btn-secondary btn-sm" href={buildHref(base, { ...params, sayfa: page + 1 })}>
            Sonraki
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function TabNav({
  items,
  active,
  label,
}: {
  items: { key: string; label: string; href: string; count?: number | string }[];
  active: string;
  label: string;
}) {
  return (
    <nav className="tabs tabs-page" aria-label={label}>
      {items.map((t) => (
        <Link key={t.key} href={t.href} className={active === t.key ? "is-active" : undefined}>
          {t.label}
          {t.count !== undefined ? <span>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function BarChart({
  data,
  format = (v: number) => String(v),
  labelEvery = 2,
  height,
}: {
  data: { key: string; label: string; value: number }[];
  format?: (v: number) => string;
  labelEvery?: number;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart">
      <div className="chart-bars" style={height ? { height } : undefined}>
        {data.map((d) => (
          <div
            key={d.key}
            className={`chart-bar${d.value ? "" : " is-empty"}`}
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
          >
            <span>
              {d.label}: {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={d.key}>{i % labelEvery === 0 ? d.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export function StatRow({ items }: { items: { label: string; value: ReactNode; hint?: ReactNode }[] }) {
  return (
    <div className="stat-row">
      {items.map((i) => (
        <div key={i.label} className="stat">
          <span className="stat-label">{i.label}</span>
          <strong className="stat-value">{i.value}</strong>
          {i.hint ? <span className="stat-hint">{i.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label: string; hint?: string }) {
  return (
    <label className="switch-field" style={{ paddingTop: 0 }}>
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} />
      <span className="switch" aria-hidden />
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
      .join("") || "?"
  );
}

export function percent(part: number, whole: number) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}%`;
}

export function relativeTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  const days = Math.round(h / 24);
  return `${days} gün önce`;
}

export function durationText(sec: number) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h} sa ${m} dk`;
  if (m) return `${m} dk ${s} sn`;
  return `${s} sn`;
}
