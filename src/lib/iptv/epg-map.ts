import { useSyncExternalStore } from "react";

const KEY = "compass.iptv.epgmap.v1";

let cache: Record<string, string> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function load(): Record<string, string> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    cache = parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(next: Record<string, string>) {
  cache = next;
  version += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  for (const l of listeners) l();
}

export function getEpgOverride(channelId: string): string | null {
  return load()[channelId] ?? null;
}

export function setEpgOverride(channelId: string, tvgId: string | null): void {
  const next = { ...load() };
  if (tvgId) next[channelId] = tvgId;
  else delete next[channelId];
  persist(next);
}

export function removeEpgOverridesForSource(sourceId: string): void {
  if (!sourceId) return;
  const map = load();
  const prefix = `${sourceId}::`;
  let changed = false;
  const next: Record<string, string> = {};
  for (const [id, tvgId] of Object.entries(map)) {
    if (id.startsWith(prefix)) {
      changed = true;
      continue;
    }
    next[id] = tvgId;
  }
  if (changed) persist(next);
}

export function useEpgMapVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}
