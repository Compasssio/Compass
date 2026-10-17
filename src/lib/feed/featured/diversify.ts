import type { FeaturedItem } from "./types";

const MAX_RUN = 3;

export function diversify(ranked: FeaturedItem[], target: number): FeaturedItem[] {
  const remaining = ranked.slice();
  const out: FeaturedItem[] = [];
  const seen = new Set<string>();
  while (out.length < target && remaining.length > 0) {
    const tail = out.slice(-MAX_RUN);
    const runGenre = tail[0]?.meta.genres?.[0] ?? "_";
    const clumped =
      tail.length === MAX_RUN && tail.every((it) => (it.meta.genres?.[0] ?? "_") === runGenre);
    let pick = 0;
    if (clumped) {
      const alt = remaining.findIndex((it) => (it.meta.genres?.[0] ?? "_") !== runGenre);
      if (alt >= 0) pick = alt;
    }
    const it = remaining.splice(pick, 1)[0];
    if (seen.has(it.meta.id)) continue;
    seen.add(it.meta.id);
    out.push(it);
  }
  return out;
}
