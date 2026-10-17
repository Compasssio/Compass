/* Discord-safe manga covers.
 *
 * Discord only renders images its own servers can fetch: a public HTTPS URL
 * that is short enough to send. Manga covers usually come from the source
 * itself - a local Suwayomi server (plain HTTP / LAN), a local folder
 * (asset.localhost), or an extension whose CDN is hotlink-protected - so they
 * are not fetchable and the presence falls back to the app default art.
 *
 * When the source cover is not Discord-fetchable we resolve the title's cover
 * from AniList instead: a public third-party HTTPS image, cached per title.
 * Nothing is routed through a Compass server.
 *
 * A common title can match the wrong series, so a candidate is only accepted
 * when its title or a synonym equals the searched title; when several entries
 * share that name, the manga's own author (and start year, when known) breaks
 * the tie. If nothing matches exactly, no cover is shown rather than a wrong
 * one.
 */
import { anilistRequest } from "@/lib/anilist/client";
import { mangaDetail } from "@/lib/manga/api";
import { readArt, writeArt } from "@/lib/manga/art-cache";
import { stripColorTag } from "@/lib/manga/title";

const QUERY = `query ($s: String) {
  m: Page(perPage: 8) {
    media(search: $s, type: MANGA, sort: SEARCH_MATCH) {
      title { romaji english native }
      synonyms
      startDate { year }
      staff(perPage: 4) { edges { node { name { full } } } }
      coverImage { extraLarge }
    }
  }
}`;

type StaffEdge = { node: { name: { full: string | null } | null } | null } | null;
type AniMedia = {
  title: { romaji: string | null; english: string | null; native: string | null } | null;
  synonyms: string[] | null;
  startDate: { year: number | null } | null;
  staff: { edges: StaffEdge[] | null } | null;
  coverImage: { extraLarge: string | null } | null;
};
type Resp = { m: { media: AniMedia[] | null } | null };

const ART_NS = "discordcover";

// Cache key -> resolved AniList cover, or null when the lookup ran and found
// nothing (so a title is never re-queried for the rest of the session).
const cache = new Map<string, string | null>();
const inflight = new Set<string>();
let notify: (() => void) | null = null;

/** Registered by the presence layer so a resolved cover can be flushed. */
export function onMangaCoverResolved(cb: () => void): void {
  notify = cb;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h === "[::1]") return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127 || a === 169) return true;
  return (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** True when Discord's servers can fetch this image: public HTTPS, <= 256 chars. */
export function discordFetchableCover(cover?: string | null): string | undefined {
  if (!cover || !cover.startsWith("https://") || cover.length > 256) return undefined;
  try {
    if (isPrivateHost(new URL(cover).hostname)) return undefined;
  } catch {
    return undefined;
  }
  return cover;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

function candidateTitles(media: AniMedia): string[] {
  return [
    media.title?.romaji,
    media.title?.english,
    media.title?.native,
    ...(media.synonyms ?? []),
  ]
    .filter((t): t is string => !!t)
    .map(norm)
    .filter(Boolean);
}

function staffNames(media: AniMedia): string[] {
  return (media.staff?.edges ?? [])
    .map((edge) => edge?.node?.name?.full)
    .filter((name): name is string => !!name);
}

function authorScore(localAuthor: string, names: string[]): number {
  const wanted = new Set(tokens(localAuthor));
  if (wanted.size === 0) return 0;
  let best = 0;
  for (const name of names) {
    const words = tokens(name);
    if (words.length === 0) continue;
    const shared = words.filter((w) => wanted.has(w)).length;
    if (shared === 0) continue;
    best = Math.max(best, shared / Math.max(wanted.size, words.length));
  }
  return best;
}

/** Picks the AniList entry that matches the searched title, using author and
 *  year only to choose between same-named entries. A known author that matches
 *  none of them means the right entry is absent, so no cover is shown. */
function pickBest(
  media: AniMedia[],
  queryNorm: string,
  author?: string,
  year?: number,
): AniMedia | null {
  const exact = media.filter((m) => candidateTitles(m).includes(queryNorm));
  if (exact.length === 0) return null;
  if (exact.length === 1) return exact[0];
  let best = exact[0];
  let bestScore = -1;
  let anyAuthorSignal = false;
  for (const m of exact) {
    const aScore = author ? authorScore(author, staffNames(m)) : 0;
    if (aScore > 0) anyAuthorSignal = true;
    let score = aScore * 2;
    const y = m.startDate?.year ?? null;
    if (year && y) score += y === year ? 1 : Math.abs(y - year) <= 1 ? 0.5 : 0;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  if (author) {
    if (anyAuthorSignal) return best;
    if (year) {
      const byYear = exact.filter((m) => {
        const y = m.startDate?.year;
        return y != null && Math.abs(y - year) <= 1;
      });
      if (byYear.length === 1) return byYear[0];
    }
    return null;
  }
  return best;
}

function keyFor(title: string, mangaId?: string): string {
  return mangaId?.trim() || title.trim().toLowerCase();
}

async function lookup(title: string, mangaId?: string): Promise<string | null> {
  const q = stripColorTag(title).trim();
  const queryNorm = norm(q);
  if (!queryNorm) return null;
  let author: string | undefined;
  let year: number | undefined;
  if (mangaId) {
    try {
      const detail = await mangaDetail(mangaId);
      author = detail?.author ?? undefined;
      year = detail?.year ?? undefined;
    } catch {
      /* fall back to title-only matching */
    }
  }
  try {
    const data = await anilistRequest<Resp>(QUERY, { s: q }, undefined, true);
    const media = (data?.m?.media ?? []).filter((m): m is AniMedia => !!m);
    return pickBest(media, queryNorm, author, year)?.coverImage?.extraLarge ?? null;
  } catch {
    return null;
  }
}

function resolve(title: string, mangaId?: string): void {
  const key = keyFor(title, mangaId);
  if (!key || cache.has(key) || inflight.has(key)) return;
  inflight.add(key);
  void (async () => {
    const url = await lookup(title, mangaId);
    cache.set(key, url);
    if (url) writeArt(ART_NS, key, url);
    inflight.delete(key);
    notify?.();
  })();
}

/** Discord-usable cover for a manga: the source cover when Discord can fetch it,
 *  otherwise the cached AniList cover (kicks off a lookup when one is missing). */
export function mangaDiscordCover(
  cover?: string | null,
  title?: string | null,
  mangaId?: string,
): string | undefined {
  const direct = discordFetchableCover(cover);
  if (direct) return direct;
  const name = title ? stripColorTag(title).trim() : "";
  if (!name) return undefined;
  const key = keyFor(name, mangaId);
  if (cache.has(key)) return cache.get(key) ?? undefined;
  const disk = readArt(ART_NS, key);
  if (disk) {
    cache.set(key, disk);
    return disk;
  }
  resolve(name, mangaId);
  return undefined;
}
