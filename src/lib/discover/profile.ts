import type { Meta } from "../cinemeta";
import type { TmdbDetail } from "../providers/tmdb";
import type { ProfileSnapshot } from "./types";

export function profileFromDetail(d: TmdbDetail): ProfileSnapshot {
  return {
    cast: d.cast.slice(0, 5).map((c) => c.id),
    directors: d.directors.map((p) => p.id),
    creators: d.creators.map((p) => p.id),
    genres: d.genres,
    keywords: d.keywords ?? [],
    decade: decadeOf(d.year),
    language: normLang(d.originalLanguage),
  };
}

export function profileFromMeta(m: Meta): ProfileSnapshot {
  return {
    cast: [],
    directors: [],
    creators: [],
    genres: m.genres ?? [],
    keywords: [],
    decade: decadeOf(m.releaseInfo),
    language: undefined,
  };
}

export function decadeOf(year?: string): string | undefined {
  if (!year) return undefined;
  const y = parseInt(year.slice(0, 4), 10);
  if (!Number.isFinite(y)) return undefined;
  return `${Math.floor(y / 10) * 10}s`;
}

function normLang(code?: string): string | undefined {
  if (!code) return undefined;
  const c = code.trim().toLowerCase();
  return c.length >= 2 ? c.slice(0, 2) : undefined;
}
