import { useEffect, useState } from "react";
import { kitsuToTvdb } from "@/lib/providers/anime-mapping";
import { parseKitsuId } from "@/lib/providers/kitsu";
import {
  tvdbSeasonTypes,
  tvdbSeriesByRemote,
  type TvdbSeasonTypeOption,
} from "@/lib/providers/tvdb";

export function useTvdbSeasonTypes(
  imdbId: string | null,
  metaId: string,
  tvdbKey: string,
  enabled: boolean,
): TvdbSeasonTypeOption[] {
  const [types, setTypes] = useState<TvdbSeasonTypeOption[]>([]);
  const remoteId =
    imdbId && imdbId.startsWith("tt")
      ? imdbId
      : metaId.startsWith("tmdb:tv:")
        ? metaId.slice(8)
        : null;
  const kitsuId = /^(kitsu|mal|anilist|anidb):/.test(metaId) ? parseKitsuId(metaId) : null;

  useEffect(() => {
    if (!enabled || (!remoteId && kitsuId == null)) {
      setTypes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      let seriesId = kitsuId != null ? await kitsuToTvdb(kitsuId).catch(() => null) : null;
      if (seriesId == null && remoteId) {
        seriesId = await tvdbSeriesByRemote(tvdbKey, remoteId).catch(() => null);
      }
      if (cancelled || !seriesId) return;
      const t = await tvdbSeasonTypes(tvdbKey, seriesId).catch(() => []);
      if (!cancelled) setTypes(t);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tvdbKey, remoteId, kitsuId]);

  return types;
}
