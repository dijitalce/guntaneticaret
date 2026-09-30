export type LogKind = "start" | "step" | "ok" | "error" | "warn" | "info" | "done" | "failed" | "skipped";

export type LogEntry = {
  at: Date | null;
  kind: LogKind;
  text: string;
  detail: string[];
  /** Adım başlangıcından bitişine geçen süre (ms); yalnızca ✔/✖ satırlarında. */
  durationMs?: number;
  /** Başlamış ama henüz bitmemiş adım. */
  open?: boolean;
};

export type LogRun = {
  startedAt: Date | null;
  finishedAt: Date | null;
  trigger: string | null;
  state: "running" | "ok" | "warning" | "failed" | "skipped" | "unknown";
  entries: LogEntry[];
  errorCount: number;
};

const STAMPED = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\]\s?([\s\S]*)$/;
const MAX_DETAIL = 60;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function classify(text: string, level?: string): { kind: LogKind; text: string } {
  if (text.startsWith("▶")) return { kind: "step", text: text.slice(1).trim() };
  if (text.startsWith("✔")) return { kind: "ok", text: text.slice(1).trim() };
  if (text.startsWith("✖")) return { kind: "error", text: text.slice(1).trim() };
  if (text.startsWith("Senkron başladı")) return { kind: "start", text };
  if (text.startsWith("Senkron tamamlandı")) return { kind: "done", text };
  if (text.startsWith("Senkron uyarılarla bitti")) return { kind: "warn", text };
  if (text.startsWith("Senkron hata ile durdu")) return { kind: "failed", text };
  if (text.startsWith("Başka bir senkron")) return { kind: "skipped", text };
  if (level === "ERROR" || /^(\w*Error|Error)\b/.test(text)) return { kind: "error", text };
  if (level === "WARN" || /atlandı|uyarı|bulunamadı|okunamadı|kaydedilemedi/i.test(text)) return { kind: "warn", text };
  return { kind: "info", text };
}

export type StageState = "done" | "running" | "error" | "pending" | "skipped";

export type Stage = {
  name: string;
  state: StageState;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  progress: { done: number; total: number } | null;
  note: string | null;
  summary: Record<string, number> | null;
  error: string | null;
  weight: number;
};

export type RunProgress = {
  percent: number;
  stages: Stage[];
  current: Stage | null;
  elapsedMs: number | null;
  etaMs: number | null;
};

const PROGRESS = /(?:Imported|İşlenen|grup)\s+(\d+)\s*\/\s*(\d+)/i;
const SUMMARY_KEYS = ["created", "processed", "unchanged", "missing", "failed", "skipped", "total"];

function stageWeight(name: string) {
  if (/indir|çek/i.test(name)) return 1;
  if (/dedupe/i.test(name)) return 1;
  return 3;
}

function scanRange(entries: LogEntry[], from: number, to: number) {
  let progress: Stage["progress"] = null;
  let note: string | null = null;
  const summary: Record<string, number> = {};
  for (let i = from; i < to; i++) {
    const e = entries[i]!;
    for (const line of [e.text, ...e.detail]) {
      const m = PROGRESS.exec(line);
      if (m) progress = { done: Number(m[1]), total: Number(m[2]) };
      for (const key of SUMMARY_KEYS) {
        const s = new RegExp(`\\b${key}:\\s*(\\d+)`).exec(line);
        if (s) summary[key] = Number(s[1]);
      }
    }
    if (e.kind === "info" && !PROGRESS.test(e.text) && /^(Altay|Başbuğ|Basbug|Okunan|Kur|Listeden)/.test(e.text)) note = e.text;
  }
  return { progress, note, summary: Object.keys(summary).length ? summary : null };
}

/** Bir çalışmanın aşamalarını ve genel yüzdesini çıkarır; `planned` henüz başlamamış aşamaları da gösterir. */
export function runProgress(run: LogRun, opts: { planned: string[]; running: boolean; now: Date; previous?: LogRun[] }): RunProgress {
  const { entries } = run;
  const stages: Stage[] = [];
  const byName = new Map<string, Stage>();
  const startIndex = new Map<string, number>();

  entries.forEach((e, i) => {
    if (e.kind === "step") {
      const stage: Stage = { name: e.text, state: "running", startedAt: e.at, finishedAt: null, durationMs: null, progress: null, note: null, summary: null, error: null, weight: stageWeight(e.text) };
      stages.push(stage);
      byName.set(e.text, stage);
      startIndex.set(e.text, i);
    } else if (e.kind === "ok" || e.kind === "error") {
      const name = e.kind === "error" ? e.text.split(":")[0]!.trim() : e.text;
      const stage = byName.get(name);
      if (!stage) return;
      stage.state = e.kind === "ok" ? "done" : "error";
      stage.finishedAt = e.at;
      stage.durationMs = e.durationMs ?? null;
      if (e.kind === "error") stage.error = e.text.slice(name.length + 1).trim() || e.text;
      Object.assign(stage, scanRange(entries, startIndex.get(name)!, i + 1));
    }
  });
  for (const stage of stages) {
    if (stage.state !== "running") continue;
    Object.assign(stage, scanRange(entries, startIndex.get(stage.name)!, entries.length));
    if (!opts.running) {
      stage.state = "error";
      stage.error ??= "Adım tamamlanmadan senkron durdu.";
    }
  }

  const finished = !opts.running || run.state !== "running";
  const lastStarted = stages.length ? opts.planned.indexOf(stages[stages.length - 1]!.name) : -1;
  opts.planned.forEach((name, idx) => {
    if (byName.has(name)) return;
    const state: StageState = finished || idx < lastStarted ? "skipped" : "pending";
    const stage: Stage = { name, state, startedAt: null, finishedAt: null, durationMs: null, progress: null, note: null, summary: null, error: null, weight: stageWeight(name) };
    const after = opts.planned.slice(0, idx).reverse().find((n) => byName.has(n));
    const pos = after ? stages.indexOf(byName.get(after)!) + 1 : 0;
    stages.splice(pos, 0, stage);
    byName.set(name, stage);
  });

  const prevDurations = new Map<string, number>();
  let prevTotal: number | null = null;
  for (const prev of opts.previous ?? []) {
    for (const e of prev.entries) if (e.kind === "ok" && e.durationMs && !prevDurations.has(e.text)) prevDurations.set(e.text, e.durationMs);
    if (prevTotal === null && prev.state === "ok" && prev.startedAt && prev.finishedAt) prevTotal = prev.finishedAt.getTime() - prev.startedAt.getTime();
  }

  const counted = stages.filter((s) => s.state !== "skipped");
  const totalWeight = counted.reduce((sum, s) => sum + s.weight, 0) || 1;
  let doneWeight = 0;
  const current = stages.find((s) => s.state === "running") ?? null;
  for (const s of counted) {
    if (s.state === "done" || s.state === "error") doneWeight += s.weight;
    else if (s === current) {
      let ratio = s.progress && s.progress.total ? s.progress.done / s.progress.total : 0;
      if (!s.progress && s.startedAt) {
        const expected = prevDurations.get(s.name);
        if (expected) ratio = Math.min(0.95, (opts.now.getTime() - s.startedAt.getTime()) / expected);
      }
      doneWeight += s.weight * Math.min(1, ratio);
    }
  }
  const allDone = finished && run.state !== "running";
  const succeeded = allDone && (run.state === "ok" || run.state === "warning");
  const percent = succeeded ? 100 : Math.min(99, Math.round((doneWeight / totalWeight) * 100));
  const end = allDone ? run.finishedAt : opts.now;
  const elapsedMs = run.startedAt && end ? end.getTime() - run.startedAt.getTime() : null;
  let etaMs: number | null = null;
  if (!allDone && elapsedMs !== null) {
    if (prevTotal && prevTotal > elapsedMs) etaMs = prevTotal - elapsedMs;
    else if (percent >= 5) etaMs = Math.round((elapsedMs * (100 - percent)) / percent);
  }
  return { percent, stages, current, elapsedMs, etaMs };
}

/** Sunucu yollarını kısaltır: /home/u…/hbuilds/versions/<id>/nodejs/node_modules/... → …/node_modules/... */
/** Sunucu dosya yollarını yalnızca dosya adına indirir; URL'lere dokunmaz. */
export function shortenPaths(line: string) {
  return line.replace(/file:\/\/(?=\/)/g, "").replace(/(?<![\w:/.~-])(?:~|\.{1,2})?(?:\/[\w.@+-]+)+\/([\w.@+-]+)/g, "$1");
}

/** Senkron log dosyasını (düz ve JSON satırlar karışık) çalışmalara ve adımlara ayırır. */
export function parseSyncLog(lines: string[]): LogRun[] {
  const entries: LogEntry[] = [];
  const push = (at: Date | null, rawText: string, level?: string) => {
    const [first = "", ...rest] = rawText.split("\n");
    const { kind, text } = classify(first.trim(), level);
    const atMs = at?.getTime();
    // Aynı satır hem JSON (konsol) hem düz metin (dosya) olarak yazılabiliyor.
    const dup = entries.slice(-4).find((e) => e.text === text && e.kind === kind && (atMs === undefined || e.at?.getTime() === atMs));
    if (dup) return;
    entries.push({ at, kind, text, detail: rest.map((l) => l.trimEnd()).filter(Boolean) });
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const obj = JSON.parse(line) as { timestamp?: string; level?: string; message?: unknown };
        const message = typeof obj.message === "string" ? obj.message : JSON.stringify(obj.message ?? "");
        const stamped = STAMPED.exec(message);
        if (stamped) push(parseDate(stamped[1]), stamped[2]!, obj.level);
        else push(parseDate(obj.timestamp), message, obj.level);
        continue;
      } catch {
        /* JSON değilse düz satır olarak işlenir */
      }
    }
    const stamped = STAMPED.exec(line);
    if (stamped) {
      push(parseDate(stamped[1]), stamped[2]!);
      continue;
    }
    const last = entries[entries.length - 1];
    if (!last) {
      entries.push({ at: null, ...classify(line.trim()), detail: [] });
      continue;
    }
    if (last.detail.length < MAX_DETAIL && !last.detail.includes(line)) last.detail.push(line);
    if (last.kind === "info" && /^\s*(\w*Error|node:internal|triggerUncaughtException)/.test(line)) last.kind = "error";
  }

  const runs: LogRun[] = [];
  let current: LogRun | null = null;
  const openSteps = new Map<string, LogEntry>();
  for (const e of entries) {
    const closed = current !== null && current.entries[0]?.kind === "start" && current.finishedAt !== null && current.state !== "running";
    if (e.kind === "start" || !current || closed) {
      openSteps.clear();
      const started = e.kind === "start";
      const trigger = started ? (/\(([^)]+)\)/.exec(e.text)?.[1] ?? null) : null;
      // Başlangıç satırı olmayan kayıtlar (ör. süreç açılırken çöktü) ayrı bir çalışma olarak gösterilir.
      current = { startedAt: e.at, finishedAt: started ? null : e.at, trigger, state: started ? "running" : "unknown", entries: [], errorCount: 0 };
      runs.push(current);
    }
    if (e.kind === "step") {
      e.open = true;
      openSteps.set(e.text, e);
    } else if (e.kind === "ok" || e.kind === "error") {
      const name = e.kind === "error" ? e.text.split(":")[0]!.trim() : e.text;
      const started = openSteps.get(name);
      if (started) {
        started.open = false;
        openSteps.delete(name);
        if (started.at && e.at) e.durationMs = e.at.getTime() - started.at.getTime();
      }
    }
    if (e.kind === "error" || e.kind === "failed") current.errorCount++;
    if (e.kind === "done" || e.kind === "warn" || e.kind === "failed" || e.kind === "skipped") {
      if (e.kind === "done") current.state = current.errorCount ? "warning" : "ok";
      else if (e.kind === "failed") current.state = "failed";
      else if (e.kind === "skipped") current.state = "skipped";
      else if (e.text.startsWith("Senkron uyarılarla")) current.state = "warning";
      if (e.kind !== "warn" || e.text.startsWith("Senkron uyarılarla")) current.finishedAt = e.at;
    }
    current.entries.push(e);
    if (current.entries[0]?.kind !== "start") {
      current.finishedAt = e.at ?? current.finishedAt;
      if (current.errorCount) current.state = "failed";
    }
  }
  // Açık kalan adımlardan sonra çalışma bittiyse (ör. süreç çöktü) "açık" işaretini kaldır.
  for (const run of runs) {
    if (run.state === "running" && run !== runs[runs.length - 1]) run.state = run.errorCount ? "failed" : "unknown";
    if (run.state !== "running") for (const e of run.entries) e.open = false;
  }
  return runs;
}
