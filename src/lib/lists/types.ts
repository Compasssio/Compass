import type { Meta } from "@/lib/cinemeta";

export type ListSource = "mdblist" | "trakt" | "tmdb" | "letterboxd" | "imdb" | "mal";

export interface CustomList {
  id: string;
  name: string;
  source: ListSource;
  ref: string;
  addedAt: number;
}

export type ListItem = Meta;

export type ResolveResult = { title?: string; items: ListItem[] };

export type ListErrorReason = "missing-key" | "not-found" | "network" | "unparseable";

export class ListResolveError extends Error {
  constructor(
    public reason: ListErrorReason,
    public source: ListSource,
  ) {
    super(`${source}: ${reason}`);
  }
}

export type ListKeys = { mdblistKey: string; tmdbKey: string };

export const SOURCE_LABELS: Record<ListSource, string> = {
  mdblist: "MDBList",
  trakt: "Trakt",
  tmdb: "TMDB",
  letterboxd: "Letterboxd",
  imdb: "IMDb",
  mal: "MyAnimeList",
};

export function sourceLabel(source: ListSource): string {
  return SOURCE_LABELS[source];
}
