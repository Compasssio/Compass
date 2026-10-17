import { topMovies } from "@/lib/cinemeta";

let cinemetaPosterCache: string[] | null = null;
let cinemetaPosterPending: Promise<string[]> | null = null;

export function getCinemetaPosterCache(): string[] | null {
  return cinemetaPosterCache;
}

export function loadCinemetaPosters(): Promise<string[]> {
  if (cinemetaPosterCache) return Promise.resolve(cinemetaPosterCache);
  if (cinemetaPosterPending) return cinemetaPosterPending;
  cinemetaPosterPending = topMovies()
    .then((metas) => {
      const posters = metas
        .map((m) => m.poster)
        .filter((p): p is string => !!p)
        .slice(0, 24);
      cinemetaPosterCache = posters;
      return posters;
    })
    .catch(() => {
      cinemetaPosterCache = [];
      return [];
    });
  return cinemetaPosterPending;
}
