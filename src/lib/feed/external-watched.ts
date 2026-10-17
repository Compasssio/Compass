import { fetchWatchedKeySet } from "@/lib/trakt/history";
import { fetchWatchedHistory } from "@/lib/simkl/history";

const STORAGE_KEY = "compass.feed.external-watched.v1";

let cache: Set<string> | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set<string>();
  }
  return cache;
}

export function externalWatchedIds(): Set<string> {
  return load();
}

export function subscribeExternalWatched(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function addImdb(out: Set<string>, id?: string | null) {
  if (id && id.startsWith("tt")) out.add(id);
}
function addMovie(out: Set<string>, id?: number | string | null) {
  if (id != null && id !== "") out.add(`tmdb:movie:${id}`);
}
function addTv(out: Set<string>, id?: number | string | null) {
  if (id != null && id !== "") out.add(`tmdb:tv:${id}`);
}

function fromTrakt(out: Set<string>, keys: Set<string>) {
  for (const key of keys) {
    const parts = key.split(":");
    const movie = parts.length === 2;
    if (parts[0] === "imdb") addImdb(out, parts[1]);
    else if (parts[0] === "tmdb") (movie ? addMovie : addTv)(out, parts[1]);
  }
}

export async function prewarmExternalWatched(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const [traktKeys, simkl] = await Promise.all([
      fetchWatchedKeySet().catch(() => new Set<string>()),
      fetchWatchedHistory(400).catch(() => []),
    ]);
    const out = new Set<string>(load());
    fromTrakt(out, traktKeys);
    for (const it of simkl) {
      addImdb(out, it.imdb);
      addImdb(out, it.showImdb);
      if (it.type === "movie") addMovie(out, it.tmdb);
      addTv(out, it.showTmdb);
    }
    cache = out;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...out]));
    } catch {}
    listeners.forEach((l) => l());
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
