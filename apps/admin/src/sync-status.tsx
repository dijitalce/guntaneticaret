"use client";

import { useEffect, useState } from "react";
import { formatDuration, nextSyncAt, previousSyncAt, trDateKey } from "./sync-time";

function clock(d: Date) {
  return d.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

function dayLabel(d: Date, now: Date) {
  const key = trDateKey(d);
  if (key === trDateKey(now)) return "bugün";
  if (key === trDateKey(new Date(now.getTime() + 86400_000))) return "yarın";
  if (key === trDateKey(new Date(now.getTime() - 86400_000))) return "dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
}

export function SyncClock({
  lastSuccessIso,
  hours,
  running,
  initialNow,
}: {
  lastSuccessIso: string | null;
  hours: number[];
  running: boolean;
  initialNow: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const next = nextSyncAt(hours, now);
  const prev = previousSyncAt(hours, next);
  const progress = Math.min(100, Math.max(0, ((now.getTime() - prev.getTime()) / (next.getTime() - prev.getTime())) * 100));
  const last = lastSuccessIso ? new Date(lastSuccessIso) : null;

  return (
    <div className="sync-clock">
      <div className="sync-clock-row">
        <div>
          <span className="sync-label">Son güncelleme</span>
          <strong>{last ? `${formatDuration(now.getTime() - last.getTime())} önce` : "Henüz yok"}</strong>
          {last ? (
            <small>
              {dayLabel(last, now)} {clock(last)}
            </small>
          ) : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="sync-label">Sonraki güncelleme</span>
          <strong>{running ? "Şu an çalışıyor" : `${formatDuration(next.getTime() - now.getTime())} kaldı`}</strong>
          <small>
            {dayLabel(next, now)} {clock(next)}
          </small>
        </div>
      </div>
      <div
        className={`sync-progress${running ? " is-running" : ""}`}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${running ? 100 : progress}%` }} />
      </div>
      <small className="muted text-sm">
        Otomatik senkron her gün{" "}
        {[...hours]
          .sort((a, b) => a - b)
          .map((h) => `${String(h).padStart(2, "0")}:00`)
          .join(" ve ")}
        &apos;de çalışır.
      </small>
    </div>
  );
}
