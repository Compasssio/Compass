import type { PlaybackEntry } from "./playback-history";

export type SeasonLockEntry = PlaybackEntry & { seriesWide?: boolean };

const STORAGE_KEY = "compass.season-lock.v1";
const TTL_MS = 120 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;

function seasonKey(metaId: string, season?: number | null): string {
  return season != null ? `${metaId}|s${season}` : `${metaId}|all`;
}

function readAll(): Record<string, SeasonLockEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SeasonLockEntry>;
    const now = Date.now();
    const fresh: Record<string, SeasonLockEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v?.savedAt) continue;
      if (now - v.savedAt > TTL_MS) continue;
      fresh[k] = v;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SeasonLockEntry>): void {
  try {
    if (Object.keys(map).length > MAX_ENTRIES) {
      const sorted = Object.entries(map).sort((a, b) => b[1].savedAt - a[1].savedAt);
      map = Object.fromEntries(sorted.slice(0, MAX_ENTRIES));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function saveSeasonLock(
  metaId: string,
  entry: Omit<PlaybackEntry, "savedAt">,
  season?: number | null,
  seriesWide?: boolean,
): void {
  const all = readAll();
  all[seriesWide ? `${metaId}|all` : seasonKey(metaId, season)] = {
    ...entry,
    seriesWide,
    savedAt: Date.now(),
  };
  writeAll(all);
}

export function readSeasonLock(metaId: string, season?: number | null): SeasonLockEntry | null {
  const all = readAll();
  const perSeason = season != null ? all[`${metaId}|s${season}`] : null;
  return perSeason ?? all[`${metaId}|all`] ?? null;
}

export function clearSeasonLock(metaId: string, season?: number | null): void {
  const all = readAll();
  if (season != null) delete all[`${metaId}|s${season}`];
  delete all[`${metaId}|all`];
  writeAll(all);
}
