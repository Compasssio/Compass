import type { Meta } from "./cinemeta";
import { lastPlayedEpisode } from "./resume";
import type { PlayEpisode } from "./view";

export function smartPlayEpisode(meta: Meta): PlayEpisode | undefined {
  if (meta.type !== "series") return undefined;
  const last = lastPlayedEpisode(meta.id);
  if (last) return { season: last.season, episode: last.episode };
  return { season: 1, episode: 1 };
}
