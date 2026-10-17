import { useEffect, useState } from "react";
import type { Meta } from "@/lib/cinemeta";
import { useTmdbImdbId } from "@/lib/providers/tmdb";
import { compassImdbTitle } from "@/lib/providers/compass-imdb";

export type LiveImdb = { value: string | undefined; isImdb: boolean };

export function useLiveImdbRating(meta: Meta): LiveImdb {
  const resolved = useTmdbImdbId(meta.id);
  const tt = meta.id.startsWith("tt") ? meta.id : resolved;
  const [compass, setCompass] = useState<string | undefined>(undefined);
  useEffect(() => {
    setCompass(undefined);
    if (!tt || !tt.startsWith("tt")) return;
    let cancelled = false;
    compassImdbTitle(tt)
      .then((r) => {
        if (!cancelled && r != null) setCompass(r.toFixed(1));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tt]);
  if (compass) return { value: compass, isImdb: true };
  if (meta.imdbRating) return { value: meta.imdbRating, isImdb: meta.id.startsWith("tt") };
  return { value: undefined, isImdb: false };
}
