import { readFileSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SYNC_LOCK_PATH = join(tmpdir(), "guntan-supplier-sync.lock");
/** Çalışan senkron kilidi bu aralıkla tazeler. */
export const LOCK_HEARTBEAT_MS = 60_000;
/** Bu süre tazelenmeyen kilit, süreci ölmüş (ör. deploy ile kesilmiş) bir senkrondan kalmıştır. */
export const LOCK_STALE_MS = 10 * 60_000;

function pidAlive(pid: number): boolean | null {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    return null;
  }
}

export type LockState = { exists: false } | { exists: true; alive: boolean; since: Date; pid: number | null };

export function readSyncLock(path = SYNC_LOCK_PATH): LockState {
  let mtime: Date;
  try {
    mtime = statSync(path).mtime;
  } catch {
    return { exists: false };
  }
  let pid: number | null = null;
  try {
    const n = Number.parseInt(readFileSync(path, "utf8").trim(), 10);
    pid = Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    pid = null;
  }
  const fresh = Date.now() - mtime.getTime() < LOCK_STALE_MS;
  const alive = fresh && (pid == null ? true : pidAlive(pid) !== false);
  return { exists: true, alive, since: mtime, pid };
}

/** Ölü kilidi siler; silindiyse true döner. */
export function clearDeadSyncLock(path = SYNC_LOCK_PATH): boolean {
  const lock = readSyncLock(path);
  if (!lock.exists || lock.alive) return false;
  rmSync(path, { force: true });
  return true;
}

export function startLockHeartbeat(path = SYNC_LOCK_PATH): () => void {
  const timer = setInterval(() => {
    try {
      const now = new Date();
      utimesSync(path, now, now);
    } catch {
      /* kilit silinmişse tazelenecek bir şey yok */
    }
  }, LOCK_HEARTBEAT_MS);
  timer.unref();
  return () => clearInterval(timer);
}
