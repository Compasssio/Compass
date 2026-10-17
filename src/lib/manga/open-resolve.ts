/* Re-resolves a saved manga (favorite / list item) to a live source id.
 *
 * Saved ids are server-scoped: Suwayomi reuses numeric manga ids after an
 * extension is uninstalled and reinstalled, and an id saved while a single
 * server was active carries no server prefix. Opening a stale id therefore
 * either fails or silently lands on a different manga. This resolver:
 *
 *   1. trusts the stored id only when its detail still matches the saved title
 *      (guards against id reuse and the wrong server);
 *   2. otherwise searches every configured source through the *library-backed*
 *      search (Suwayomi's `search` with no source tag filters the server's
 *      library), which resolves titles the extension search cannot - e.g. an
 *      Akuma entry named in Japanese;
 *   3. then falls back to the everywhere (extension) search.
 *
 * Matching is a Unicode-aware exact title comparison (color-tag aware), so it
 * works for Japanese/Chinese/Korean titles that the latin-only tracker matcher
 * cannot compare. A match is never guessed from the first result.
 */
import { mangaDetail, searchMangaEverywhere } from "@/lib/manga/api";
import { streamAll } from "@/lib/manga/sources/aggregate";
import { stripColorTag } from "@/lib/manga/title";
import type { MangaSummary } from "@/lib/manga/types";

export type MangaOpenTarget = {
  id?: string | null;
  title: string;
  altTitle?: string | null;
};

export type ResolvedManga = { id: string; title: string; cover?: string };

/** Script-agnostic title key: color tag removed, case-folded, punctuation and
 *  spacing dropped while keeping every letter/number (any alphabet). */
export function mangaTitleKey(title: string): string {
  return stripColorTag(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function mangaTitlesMatch(
  query: string,
  candidate: string | null | undefined,
  altTitle?: string | null,
): boolean {
  const key = mangaTitleKey(query);
  if (!key) return false;
  return [candidate, altTitle].some((v) => !!v && mangaTitleKey(v) === key);
}

function pick(hits: MangaSummary[], query: string): MangaSummary | null {
  return hits.find((h) => mangaTitlesMatch(query, h.title, h.altTitle)) ?? null;
}

export async function resolveMangaOpen(target: MangaOpenTarget): Promise<ResolvedManga | null> {
  const queries = [target.title, target.altTitle].filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );

  if (target.id) {
    const detail = await mangaDetail(target.id).catch(() => null);
    if (detail && queries.some((q) => mangaTitlesMatch(q, detail.title, detail.altTitle))) {
      return { id: target.id, title: detail.title, cover: detail.cover };
    }
  }

  for (const query of queries) {
    const hits = await streamAll(
      (provider) => provider.search(query, 0),
      () => {},
    ).catch(() => [] as MangaSummary[]);
    const hit = pick(hits, query);
    if (hit) return { id: hit.id, title: hit.title, cover: hit.cover };
  }

  for (const query of queries) {
    const hits = await searchMangaEverywhere(query).catch(() => [] as MangaSummary[]);
    const hit = pick(hits, query);
    if (hit) return { id: hit.id, title: hit.title, cover: hit.cover };
  }

  return null;
}
