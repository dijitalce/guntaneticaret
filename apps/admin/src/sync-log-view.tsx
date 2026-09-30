import type { ReactNode } from "react";
import { EmptyState, StatusBadge } from "./ui";
import { parseSyncLog, runProgress, shortenPaths, type LogEntry, type LogRun, type Stage } from "./sync-log";

const TZ = "Europe/Istanbul";

const STAGE_INFO: Record<string, { label: string; hint: string }> = {
  "Altay XML indir": { label: "Altay XML indirme", hint: "Eryaz servisinden güncel ürün, fiyat ve stok dosyası indirilir." },
  "Başbuğ API çek": { label: "Başbuğ verisi çekme", hint: "Başbuğ API'sinden ürün grupları, net fiyat, stok ve döviz kuru çekilir." },
  "Altay import": { label: "Altay ürünlerini içe aktarma", hint: "Değişen ürünler veritabanına yazılır, fiyat dilimleri uygulanır." },
  "Başbuğ import": { label: "Başbuğ ürünlerini içe aktarma", hint: "Değişen ürünler yazılır; ardından en ucuz eşleşme ve görünürlük derlenir." },
  "Dedupe + görünürlük": { label: "Eşleştirme ve görünürlük", hint: "Aynı parçanın en uygun tedarikçisi seçilir, sitelerdeki görünürlük güncellenir." },
};

const SUMMARY_LABEL: Record<string, string> = {
  created: "Yazılan",
  processed: "İşlenen",
  unchanged: "Değişmeyen",
  missing: "Satıştan kalkan",
  failed: "Hatalı",
  skipped: "Atlanan",
  total: "Toplam",
};

function stageInfo(name: string) {
  const known = STAGE_INFO[name];
  if (known) return known;
  const feed = /^(.*) \(XML kaynağı\)$/.exec(name);
  if (feed) return { label: `${feed[1]} içe aktarma`, hint: "Panelden eklenen XML adresi indirilir ve ürünleri içe aktarılır." };
  return { label: name, hint: "" };
}

function clock(d: Date | null, seconds = false) {
  if (!d) return "—";
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), timeZone: TZ });
}

function dateTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function duration(ms: number | null | undefined) {
  if (ms === null || ms === undefined || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk ${s % 60 ? `${s % 60} sn` : ""}`.trim();
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

function num(n: number) {
  return n.toLocaleString("tr-TR");
}

function triggerLabel(trigger: string | null) {
  if (!trigger) return "";
  if (trigger === "cron") return "Otomatik (zamanlanmış görev)";
  if (trigger.startsWith("panel")) return `Panelden${trigger.includes(":") ? ` · ${trigger.split(":").slice(1).join(":")}` : ""}`;
  return trigger;
}

const RUN_BADGE: Record<LogRun["state"], { tone: "ok" | "warn" | "bad" | "info" | "neutral"; label: string }> = {
  running: { tone: "info", label: "Çalışıyor" },
  ok: { tone: "ok", label: "Tamamlandı" },
  warning: { tone: "warn", label: "Uyarılarla bitti" },
  failed: { tone: "bad", label: "Hata ile durdu" },
  skipped: { tone: "neutral", label: "Atlandı" },
  unknown: { tone: "neutral", label: "Yarım kaldı" },
};

function runBadge(run: LogRun) {
  if (run.entries[0]?.kind !== "start" && run.state === "failed") return { tone: "bad" as const, label: "Başlatılamadı" };
  return RUN_BADGE[run.state === "running" ? "unknown" : run.state];
}

function StageIcon({ state }: { state: Stage["state"] }) {
  const glyph = state === "done" ? "✓" : state === "error" ? "✕" : state === "skipped" ? "–" : state === "running" ? "" : "";
  return (
    <span className={`stage-dot is-${state}`} aria-hidden>
      {glyph}
    </span>
  );
}

function StageRow({ stage, now }: { stage: Stage; now: Date }) {
  const info = stageInfo(stage.name);
  const ratio = stage.progress && stage.progress.total ? Math.min(100, (stage.progress.done / stage.progress.total) * 100) : null;
  const took = stage.durationMs ?? (stage.state === "running" && stage.startedAt ? now.getTime() - stage.startedAt.getTime() : null);
  return (
    <li className={`stage is-${stage.state}`}>
      <StageIcon state={stage.state} />
      <div className="stage-body">
        <div className="stage-head">
          <strong>{info.label}</strong>
          <span className="stage-time">
            {stage.state === "pending"
              ? "Sırada"
              : stage.state === "skipped"
                ? "Atlandı"
                : `${clock(stage.startedAt)} · ${duration(took)}${stage.state === "running" ? " sürüyor" : ""}`}
          </span>
        </div>
        {info.hint && stage.state !== "done" ? <p className="stage-hint">{info.hint}</p> : null}
        {stage.state === "running" ? (
          <div className="stage-bar">
            <div className={`bar${ratio === null ? " is-indeterminate" : ""}`}>
              <span style={{ width: `${ratio ?? 35}%` }} />
            </div>
            <span className="stage-count">
              {stage.progress ? `${num(stage.progress.done)} / ${num(stage.progress.total)}${ratio !== null ? ` · %${Math.floor(ratio)}` : ""}` : "Çalışıyor…"}
            </span>
          </div>
        ) : null}
        {stage.note ? <p className="stage-note">{stage.note}</p> : null}
        {stage.summary ? (
          <div className="stage-chips">
            {Object.entries(stage.summary).map(([k, v]) => (
              <span key={k} className={`chip${k === "failed" && v > 0 ? " is-bad" : ""}`}>
                {SUMMARY_LABEL[k] ?? k} <b>{num(v)}</b>
              </span>
            ))}
          </div>
        ) : null}
        {stage.error ? <p className="stage-error">{shortenPaths(stage.error)}</p> : null}
      </div>
    </li>
  );
}

function Timeline({ entries }: { entries: LogEntry[] }) {
  return (
    <ol className="log-timeline">
      {entries.map((e, i) => (
        <li key={i} className={`is-${e.kind}`}>
          <time>{clock(e.at, true)}</time>
          <div>
            <span>{shortenPaths(e.text)}</span>
            {e.detail.length ? (
              <details>
                <summary>Teknik ayrıntı ({e.detail.length} satır)</summary>
                <pre>{e.detail.map(shortenPaths).join("\n")}</pre>
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function RunCard({ run, planned, running, now, previous, live }: { run: LogRun; planned: string[]; running: boolean; now: Date; previous: LogRun[]; live: boolean }) {
  const p = runProgress(run, { planned: live ? planned : [], running: live && running, now, previous });
  const badge = live && running ? RUN_BADGE.running : runBadge(run);
  const errors = run.entries.filter((e) => e.kind === "error" || e.kind === "failed");
  const done = p.stages.filter((s) => s.state === "done").length;
  const counted = p.stages.filter((s) => s.state !== "skipped").length;
  const tone = badge.tone === "bad" ? "bad" : badge.tone === "warn" ? "warn" : badge.tone === "ok" ? "ok" : "info";
  return (
    <div className="sync-run">
      <div className="sync-run-head">
        <div className={`sync-ring is-${tone}`} style={{ "--p": p.percent } as Record<string, number>}>
          <span>%{p.percent}</span>
        </div>
        <div className="sync-run-meta">
          <div className="sync-run-title">
            <strong>{live && running && p.current ? stageInfo(p.current.name).label : badge.label}</strong>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </div>
          <div className="sync-run-facts">
            <span>
              Başlangıç <b>{dateTime(run.startedAt)}</b>
            </span>
            <span>
              {live && running ? "Geçen" : "Süre"} <b>{duration(p.elapsedMs)}</b>
            </span>
            {live && running && p.etaMs ? (
              <span>
                Tahmini kalan <b>~{duration(p.etaMs)}</b>
              </span>
            ) : null}
            <span>
              Adım <b>{done} / {counted}</b>
            </span>
            <span>{triggerLabel(run.trigger)}</span>
          </div>
          <div className={`bar is-lg${live && running ? " is-live" : ""} is-${tone}`}>
            <span style={{ width: `${p.percent}%` }} />
          </div>
        </div>
      </div>

      {p.stages.length ? (
        <ol className="stage-list">
          {p.stages.map((s) => (
            <StageRow key={s.name} stage={s} now={now} />
          ))}
        </ol>
      ) : null}

      {errors.length ? (
        <div className="sync-errors">
          <strong>{errors.length === 1 ? "Bir hata oluştu" : `${errors.length} hata oluştu`}</strong>
          <ul>
            {errors.slice(0, 6).map((e, i) => (
              <li key={i}>
                <span>{clock(e.at, true)}</span> {shortenPaths(e.text)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="sync-more">
        <summary>Adım adım kayıt ({run.entries.length})</summary>
        <Timeline entries={run.entries} />
      </details>
    </div>
  );
}

export function SyncLogView({ lines, planned, running, logFile, now = new Date() }: { lines: string[]; planned: string[]; running: boolean; logFile: string; now?: Date }): ReactNode {
  const runs = parseSyncLog(lines).filter((r) => r.entries.length);
  if (!runs.length) return <EmptyState title="Henüz kayıt yok" description="Sunucuda ilk senkron çalıştığında ilerleme burada görünür." />;
  const ordered = [...runs].reverse();
  const [latest, ...older] = ordered;
  return (
    <div className="sync-log">
      <RunCard run={latest!} planned={planned} running={running} now={now} previous={older} live />
      {older.length ? (
        <div className="sync-history">
          <h3>Önceki çalışmalar</h3>
          {older.slice(0, 8).map((run, i) => {
            const badge = runBadge(run);
            const took = run.startedAt && run.finishedAt && run.entries[0]?.kind === "start" ? run.finishedAt.getTime() - run.startedAt.getTime() : null;
            return (
              <details key={i} className="sync-history-item">
                <summary>
                  <span className="sync-history-date">{run.startedAt ? dateTime(run.startedAt) : "Tarihsiz kayıtlar"}</span>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="muted text-sm">{triggerLabel(run.trigger)}</span>
                  <span className="muted text-sm" style={{ marginLeft: "auto" }}>
                    {took !== null ? duration(took) : ""}
                    {run.errorCount ? ` · ${run.errorCount} hata` : ""}
                  </span>
                </summary>
                <RunCard run={run} planned={[]} running={false} now={now} previous={older.slice(i + 1)} live={false} />
              </details>
            );
          })}
        </div>
      ) : null}
      <details className="sync-more">
        <summary>Ham log · {logFile}</summary>
        <pre className="log-view">{lines.map(shortenPaths).join("\n")}</pre>
      </details>
    </div>
  );
}
