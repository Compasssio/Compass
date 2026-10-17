import type { Meta } from "@/lib/cinemeta";
import { recentlyPlayed, watchTitleKey } from "@/lib/playback-history";
import { isMovieWatchedLocal } from "@/lib/movie-watched";
import { isWatchedFlagged } from "@/lib/watched-flag";
import { manualWatchedLibraryItems } from "@/lib/manual-watched";
import {
  tmdbFromImdbCached,
  tmdbIdFromImdb,
  tmdbImdbCached,
  tmdbImdbId,
} from "@/lib/providers/tmdb/tmdb-imdb-resolve";
import { externalWatchedIds } from "./external-watched";
import { getDownvotedIds, getVoteEntries } from "./preferences";

const UPVOTE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type ExclusionSets = {
  ids: Set<string>;
  titles: Set<string>;
  downIds: Set<string>;
  downTitles: Set<string>;
  recentUpTs: Map<string, number>;
};

function canonical(id: string): string | undefined {
  if (id.startsWith("tt")) return tmdbFromImdbCached(id) ?? undefined;
  if (id.startsWith("tmdb:")) return tmdbImdbCached(id) ?? undefined;
  return undefined;
}

export function buildExclusionSets(): ExclusionSets {
  const downIds = getDownvotedIds();
  const downTitles = new Set<string>();
  const recentUpTs = new Map<string, number>();
  for (const e of getVoteEntries()) {
    if (e.vote === "down" && e.name) downTitles.add(watchTitleKey(e.name));
    else if (e.vote === "up") recentUpTs.set(e.id, e.ts);
  }

  const played = recentlyPlayed();
  const ids = new Set<string>();
  const titles = new Set<string>(played.titles);
  const addId = (id: string) => {
    ids.add(id);
    const c = canonical(id);
    if (c) ids.add(c);
  };
  for (const id of played.ids) addId(id);
  for (const it of manualWatchedLibraryItems()) {
    addId(it._id);
    if (it.name) titles.add(watchTitleKey(it.name));
  }
  for (const id of externalWatchedIds()) addId(id);
  for (const id of downIds) addId(id);

  return { ids, titles, downIds, downTitles, recentUpTs };
}

export function isExcluded(m: Meta, sets: ExclusionSets, now = Date.now()): boolean {
  if (sets.downIds.has(m.id) || sets.ids.has(m.id)) return true;
  const c = canonical(m.id);
  if (c && sets.ids.has(c)) return true;
  const key = watchTitleKey(m.name);
  if (key && (sets.titles.has(key) || sets.downTitles.has(key))) return true;
  if (isMovieWatchedLocal(m.id) || (c != null && isMovieWatchedLocal(c))) return true;
  if (isWatchedFlagged(m.id) || (c != null && isWatchedFlagged(c))) return true;
  const upTs = sets.recentUpTs.get(m.id) ?? (c != null ? sets.recentUpTs.get(c) : undefined);
  if (upTs != null && now - upTs < UPVOTE_COOLDOWN_MS) return true;
  return false;
}

export async function warmCandidateIds(key: string, metas: Meta[]): Promise<void> {
  if (!key) return;
  const jobs: Promise<unknown>[] = [];
  const seen = new Set<string>();
  for (const m of metas) {
    if (m.id.startsWith("tmdb:") && !seen.has(m.id)) {
      seen.add(m.id);
      jobs.push(tmdbImdbId(key, m.id).catch(() => null));
    }
  }
  const ttIds = new Set<string>();
  const collect = (id: string) => {
    if (id.startsWith("tt")) ttIds.add(id);
  };
  for (const id of recentlyPlayed().ids) collect(id);
  for (const id of externalWatchedIds()) collect(id);
  for (const id of getDownvotedIds()) collect(id);
  let n = 0;
  for (const id of ttIds) {
    if (n++ >= 80) break;
    jobs.push(tmdbIdFromImdb(key, id).catch(() => null));
  }
  await Promise.all(jobs);
}
