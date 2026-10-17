export const REVS_KEY = "compass.sync.revs";
export const ACCOUNT_KEY = "compass.sync.account";
export const QUEUE_KEY = "compass.sync.queue";
export const IDMAP_KEY = "compass.sync.idmap";
export const SENT_KEY = "compass.sync.sent";
export const LAST_PULL_KEY = "compass.sync.lastPullAt";
export const PARKED_PREFIX = "compass.sync.parked.";

export const SYNC_KEY_PREFIX = "compass.sync.";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed == null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function syncKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SYNC_KEY_PREFIX)) out.push(k);
    }
  } catch {
    return out;
  }
  return out;
}
