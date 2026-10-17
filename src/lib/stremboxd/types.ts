export type StremboxdCatalogKind = "public" | "full";

export type StremboxdCatalog = {
  type: string;
  id: string;
  name: string;
  extra?: Array<{ name: string; isRequired?: boolean; options?: string[]; optionsLimit?: number }>;
};

export type StremboxdManifest = {
  id: string;
  name: string;
  version?: string;
  types: string[];
  resources: Array<string | { name: string; types: string[] }>;
  catalogs: StremboxdCatalog[];
};

export type StremboxdMeta = {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  year?: number;
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
  director?: string[];
  cast?: string[];
  writer?: string[];
  trailers?: Array<{ source: string; type?: string }>;
  links?: Array<{ name: string; category: string; url: string }>;
  behaviorHints?: Record<string, unknown>;
};

export type StremboxdCatalogResponse = { metas: StremboxdMeta[] };

export type StremboxdMetaResponse = { meta: StremboxdMeta | null };

export type LetterboxdListRef = {
  id: string;
  name: string;
  owner?: string;
  filmCount?: number;
};

export type LetterboxdUsernameValidation = {
  valid: boolean;
  memberId?: string;
  displayName?: string;
  username?: string;
  lists?: LetterboxdListRef[];
};

export type LetterboxdLoginResponse = {
  userToken: string;
  manifestUrl: string;
  user: { id: string; username: string; displayName: string | null };
  lists?: LetterboxdListRef[];
  preferences?: Record<string, unknown> | null;
};

export type LetterboxdLoginError = {
  error: string;
  code?: "2FA_REQUIRED" | "INVALID_CREDENTIALS" | string;
};

export type LetterboxdFilm = {
  id: string;
  name: string;
  releaseYear?: number;
  imdbId?: string;
  tmdbId?: string;
};

export type LetterboxdFilmRating = {
  filmId?: string;
  rating?: number | null;
  userRating?: number | null;
  watched?: boolean;
  liked?: boolean;
  inWatchlist?: boolean;
  communityRating?: number | null;
  globalRating?: number | null;
  communityRatings?: number;
  watchCount?: number;
};

export type LetterboxdSession = {
  userToken: string;
  userId: string;
  username: string;
  displayName: string | null;
  loginAt: number;
  lists?: LetterboxdListRef[];
};
