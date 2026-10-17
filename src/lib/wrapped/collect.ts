import { manualWatchedLibraryItems } from "@/lib/manual-watched";
import { playbackEntries } from "@/lib/playback-history";
import { fetchWatchedHistory as fetchTraktHistory } from "@/lib/trakt/history";
import { isDetectedAnime } from "@/lib/anime-detect";
import type { WatchEvent, WatchType, WrappedSource } from "./types";

const isAnimeId = (id: string) => /^(kitsu|mal|anilist|anidb|simkl):/.test(id);

function isAnime(id: string, imdb?: string): boolean {
  return isAnimeId(id) || isDetectedAnime(id) || (imdb != null && isDetectedAnime(imdb));
}

function localType(id: string): WatchType {
  return isAnimeId(id) || isDetectedAnime(id) ? "anime" : "series";
}

function localAnimeEvents(exclude: Set<string>): WatchEvent[] {
  const out: WatchEvent[] = [];
  const seen = new Set<string>();
  const push = (id: string, title: string, ts: number) => {
    if (!id || !title || !Number.isFinite(ts) || ts <= 0) return;
    if (!(isAnimeId(id) || isDetectedAnime(id))) return;
    const key = `${id}:${ts}`;
    if (seen.has(key) || exclude.has(key)) return;
    seen.add(key);
    out.push({ id, title, type: "anime", watchedAt: ts });
  };
  try {
    for (const li of manualWatchedLibraryItems()) {
      push(li._id, li.name ?? li._id, Date.parse(li.state?.lastWatched ?? li._mtime ?? ""));
    }
  } catch {
    /* ignore */
  }
  try {
    for (const p of playbackEntries()) {
      push(p.metaId, p.parsedTitle || p.title || p.metaId, p.savedAt);
    }
  } catch {
    /* ignore */
  }
  return out;
}

export async function collectWatchEvents(opts: {
  traktConnected: boolean;
}): Promise<{ events: WatchEvent[]; source: WrappedSource }> {
  if (opts.traktConnected) {
    try {
      const hist = await fetchTraktHistory(2000);
      const events = hist
        .map((h): WatchEvent => {
          const movie = h.type === "movie";
          const imdb = movie ? h.imdb : (h.showImdb ?? h.imdb);
          const tmdb = movie ? h.tmdb : (h.showTmdb ?? h.tmdb);
          const id =
            imdb ?? (tmdb != null ? `tmdb:${movie ? "movie" : "tv"}:${tmdb}` : String(h.id));
          const type: WatchType = isAnime(id, imdb) ? "anime" : movie ? "movie" : "series";
          return { id, title: h.title, type, watchedAt: Date.parse(h.watchedAt), imdb };
        })
        .filter((e) => e.title && Number.isFinite(e.watchedAt));
      if (events.length > 0) {
        const seen = new Set(events.map((e) => `${e.id}:${e.watchedAt}`));
        return { events: [...events, ...localAnimeEvents(seen)], source: "trakt" };
      }
    } catch {
      /* fall through to local */
    }
  }

  const events: WatchEvent[] = [];
  try {
    for (const li of manualWatchedLibraryItems()) {
      const ts = Date.parse(li.state?.lastWatched ?? li._mtime ?? "");
      if (!li._id || !Number.isFinite(ts)) continue;
      events.push({
        id: li._id,
        title: li.name ?? li._id,
        type: localType(li._id),
        watchedAt: ts,
      });
    }
  } catch {
    /* ignore */
  }
  try {
    const seen = new Set(events.map((e) => `${e.id}:${e.watchedAt}`));
    for (const p of playbackEntries()) {
      const key = `${p.metaId}:${p.savedAt}`;
      if (seen.has(key)) continue;
      events.push({
        id: p.metaId,
        title: p.parsedTitle || p.title || p.metaId,
        type: localType(p.metaId),
        watchedAt: p.savedAt,
      });
    }
  } catch {
    /* ignore */
  }

  const valid = events.filter((e) => e.title && Number.isFinite(e.watchedAt) && e.watchedAt > 0);
  return valid.length > 0 ? { events: valid, source: "local" } : { events: [], source: "empty" };
}
