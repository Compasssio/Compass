import { tmdbImdbCached } from "@/lib/providers/tmdb/tmdb-imdb-resolve";
import type { FeaturedItem, LaneSource } from "./types";

const PRIORITY: LaneSource[] = [
  "similar",
  "streaming",
  "imdb",
  "tmdb",
  "trending",
  "acclaimed",
  "awards",
  "seed",
];
const rankOf = (s: LaneSource) => PRIORITY.indexOf(s);

function canonicalKey(id: string): string {
  if (id.startsWith("tmdb:")) return tmdbImdbCached(id) ?? id;
  return id;
}

function stamp(it: FeaturedItem): FeaturedItem {
  const m = it.meta;
  if (m.sourceRank == null) m.sourceRank = it.sourceRank;
  if (m.tmdbScore == null && m.imdbRating) {
    const v = Number(m.imdbRating);
    if (Number.isFinite(v) && v > 0) m.tmdbScore = v;
  }
  return it;
}

export function mergeAndDedup(items: FeaturedItem[]): FeaturedItem[] {
  const byKey = new Map<string, FeaturedItem>();
  for (const it of items) {
    if (!it.meta.id || !it.meta.background) continue;
    const key = canonicalKey(it.meta.id);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, stamp(it));
      continue;
    }
    const winner = rankOf(it.source) < rankOf(prev.source) ? it : prev;
    const loser = winner === it ? prev : it;
    const merged = stamp(winner);
    if (!merged.meta.providerBadge && loser.meta.providerBadge) {
      merged.meta.providerBadge = loser.meta.providerBadge;
    }
    byKey.set(key, merged);
  }
  return [...byKey.values()];
}
