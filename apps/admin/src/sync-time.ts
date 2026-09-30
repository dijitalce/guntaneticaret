const TR_OFFSET_MS = 3 * 3600_000;

export function trDateKey(d: Date) {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

export function nextSyncAt(hours: number[], from: Date): Date {
  const tr = new Date(from.getTime() + TR_OFFSET_MS);
  const sorted = [...hours].sort((a, b) => a - b);
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    for (const h of sorted) {
      const candidate = Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate() + dayOffset, h) - TR_OFFSET_MS;
      if (candidate > from.getTime()) return new Date(candidate);
    }
  }
  return new Date(from.getTime() + 12 * 3600_000);
}

export function previousSyncAt(hours: number[], next: Date): Date {
  const sorted = [...hours].sort((a, b) => a - b);
  const idx = sorted.indexOf(new Date(next.getTime() + TR_OFFSET_MS).getUTCHours());
  if (idx > 0) return new Date(next.getTime() - (sorted[idx]! - sorted[idx - 1]!) * 3600_000);
  return new Date(next.getTime() - (24 - sorted[sorted.length - 1]! + sorted[0]!) * 3600_000);
}

export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d) return `${d} gün ${h} sa`;
  if (h) return `${h} sa ${m} dk`;
  return `${m} dk`;
}
