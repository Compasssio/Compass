/**
 * Type definitions for episode detail page data structures
 * Following the existing patterns from tmdb-details.ts
 */

/**
 * Guest star information for an episode
 */
export type GuestStar = {
  id: number;
  name: string;
  character: string;
  order: number;
  profilePath: string | null;
};

/**
 * Crew member information for an episode
 */
export type CrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
};

/**
 * Episode still image metadata from TMDB
 */
export type StillImage = {
  aspectRatio: number;
  filePath: string;
  height: number;
  width: number;
  voteAverage: number;
};

/**
 * Complete episode information fetched from TMDB API
 */
export type EpisodeDetail = {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
  voteAverage: number | null;
  voteCount: number;
  imdbId: string | null;
  guestStars: GuestStar[];
  crew: CrewMember[];
  stills: StillImage[];
};

/**
 * Cache entry for episode data with TTL
 */
export type EpisodeCacheEntry = {
  data: EpisodeDetail;
  timestamp: number;
  seriesId: string;
};

/**
 * TMDB API response types for episode details
 * Raw response structure from TMDB API v3
 */
export type TmdbEpisodeResponse = {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number | null;
  vote_count: number;
  credits: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      order: number;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path: string | null;
    }>;
    guest_stars: Array<{
      id: number;
      name: string;
      character: string;
      order: number;
      profile_path: string | null;
    }>;
  };
  images: {
    stills: Array<{
      aspect_ratio: number;
      file_path: string;
      height: number;
      width: number;
      vote_average: number;
    }>;
  };
  external_ids: {
    imdb_id: string | null;
  };
};
