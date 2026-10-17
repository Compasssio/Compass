import type { SimklCache } from "../activities";
import type { SimklItem, SimklIds } from "../types";
import { fetchCdnCalendarCombined } from "./cdn";

export async function computeUpNextShows(cache: SimklCache): Promise<SimklItem[]> {
  const upcomingShows: SimklItem[] = [];

  try {
    const calendarItems = await fetchCdnCalendarCombined();
    calendarItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 30);

    const matchedIds = new Set<number>();

    for (const cdnItem of calendarItems) {
      const epDate = new Date(cdnItem.date);
      if (isNaN(epDate.getTime()) || epDate < today || epDate > limitDate) {
        continue;
      }

      let matchedSimklId: number | null = null;
      if (cdnItem.ids) {
        const { simkl_id, imdb, tmdb, mal, kitsu } = cdnItem.ids;
        if (simkl_id && cache.items[String(simkl_id)]) {
          matchedSimklId = simkl_id;
        }
        if (!matchedSimklId && imdb && cache.imdbToSimkl[imdb]) {
          matchedSimklId = cache.imdbToSimkl[imdb];
        }
        if (!matchedSimklId && tmdb) {
          const tmdbStr = String(tmdb);
          if (cache.tmdbToSimkl[`tv:${tmdbStr}`]) {
            matchedSimklId = cache.tmdbToSimkl[`tv:${tmdbStr}`];
          } else if (cache.tmdbToSimkl[`movie:${tmdbStr}`]) {
            matchedSimklId = cache.tmdbToSimkl[`movie:${tmdbStr}`];
          }
        }
        if (!matchedSimklId && mal && cache.malToSimkl[String(mal)]) {
          matchedSimklId = cache.malToSimkl[String(mal)];
        }
        if (!matchedSimklId && kitsu && cache.kitsuToSimkl[String(kitsu)]) {
          matchedSimklId = cache.kitsuToSimkl[String(kitsu)];
        }
      }

      if (matchedSimklId && !matchedIds.has(matchedSimklId)) {
        const cachedItem = cache.items[String(matchedSimklId)];
        if (
          cachedItem &&
          (cachedItem.type === "show" || cachedItem.type === "anime") &&
          (cachedItem.status === "watching" || cachedItem.status === "plantowatch")
        ) {
          matchedIds.add(matchedSimklId);

          const ids: SimklIds = {
            simkl: cachedItem.simklId,
          };
          for (const [imdbId, sId] of Object.entries(cache.imdbToSimkl)) {
            if (sId === cachedItem.simklId) ids.imdb = imdbId;
          }
          for (const [tmdbKey, sId] of Object.entries(cache.tmdbToSimkl)) {
            if (sId === cachedItem.simklId) {
              const parts = tmdbKey.split(":");
              if (parts.length === 2) {
                ids.tmdb = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : parts[1];
              }
            }
          }
          for (const [malId, sId] of Object.entries(cache.malToSimkl)) {
            if (sId === cachedItem.simklId) ids.mal = Number(malId);
          }
          for (const kitsuId of Object.keys(cache.kitsuToSimkl)) {
            if (cache.kitsuToSimkl[kitsuId] === cachedItem.simklId) {
              ids.kitsu = Number(kitsuId);
            }
          }

          if (!ids.imdb && cdnItem.ids?.imdb) ids.imdb = cdnItem.ids.imdb;
          if (!ids.tmdb && cdnItem.ids?.tmdb) ids.tmdb = Number(cdnItem.ids.tmdb);

          upcomingShows.push({
            type: "show",
            title: cachedItem.title,
            year: cachedItem.year,
            ids,
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to compute Up Next shows on SIMKL", e);
  }

  return upcomingShows;
}
