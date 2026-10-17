const STORAGE_KEY = "compass.player.prefs.v1";
const MAX_ENTRIES = 200;

export type PerShowPrefs = {
  rate?: number;
  subDelaySec?: number;
  audioLang?: string;
  subLang?: string;
  subsOff?: boolean;
  updatedAt: number;
};

type Store = Record<string, PerShowPrefs>;

let cache: Store | null = null;

function loadStore(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persistStore(): void {
  if (!cache) return;
  const entries = Object.entries(cache);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
    cache = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function readPlayerPrefs(metaId: string): PerShowPrefs | null {
  if (!metaId) return null;
  const store = loadStore();
  return store[metaId] ?? null;
}

export function writePlayerPrefs(metaId: string, patch: Partial<PerShowPrefs>): void {
  if (!metaId) return;
  const store = loadStore();
  const prev = store[metaId] ?? { updatedAt: 0 };
  store[metaId] = { ...prev, ...patch, updatedAt: Date.now() };
  persistStore();
}

export function clearPlayerPrefs(metaId: string): void {
  if (!metaId) return;
  const store = loadStore();
  delete store[metaId];
  persistStore();
}
