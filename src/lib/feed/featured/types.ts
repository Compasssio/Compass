import type { Meta } from "@/lib/cinemeta";

export type LaneSource =
  | "similar"
  | "streaming"
  | "imdb"
  | "tmdb"
  | "acclaimed"
  | "awards"
  | "seed"
  | "trending";

export type FeaturedItem = {
  meta: Meta;
  source: LaneSource;
  sourceRank: number;
  seedId?: string;
  seedTs?: number;
};

export const SOURCE_BASE: Record<LaneSource, number> = {
  streaming: 1.0,
  imdb: 1.0,
  similar: 1.0,
  trending: 0.95,
  tmdb: 0.9,
  awards: 0.85,
  acclaimed: 0.85,
  seed: 0.7,
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const HALF_LIFE_SUPP_MS = 12 * DAY_MS;
export const HALF_LIFE_TASTE_MS = 30 * DAY_MS;
export const SUPPRESS_MAX = 6;

export const WEIGHTS = { AFF: 6, QUAL: 2, PROM: 1.2, SIM: 4.5, NOV: 0.8 };
