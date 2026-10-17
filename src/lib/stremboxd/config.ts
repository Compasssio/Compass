export const STREMBOXD_BASE = "https://api.stremboxd.com";

export type StremboxdPublicConfig = {
  u?: string;
  c: {
    watchlist?: boolean;
    popular: boolean;
    top250: boolean;
    likedFilms?: boolean;
  };
  l: string[];
  r: boolean;
  n?: Record<string, string>;
  w?: string[];
  o?: string[];
  s?: Record<string, string[]>;
  f?: Array<{ t: "d" | "a" | "s"; id: string }>;
  h?: boolean;
  q?: boolean;
};

// Encoded config format (base64url, UTF-8 safe) — mirrors what the configure
// page at https://stremboxd.com/configure generates and what the backend's
// `encodeConfig` (backend/src/lib/config-encoding.ts) accepts. The segment is
// placed in the URL path: `{STREMBOXD_BASE}/{encodedConfig}/manifest.json` etc.
//
// Fields:
//   u          Letterboxd username (optional; gates watchlist + liked films)
//   c          catalog toggles — `popular` and `top250` are REQUIRED booleans,
//              `watchlist` / `likedFilms` are optional
//   l          array of custom list IDs (required, may be empty)
//   r          show ratings on posters (required)
//   n/w/o/s/f/h/q  optional advanced knobs (names, extra watchlists, sort, etc.)
//
// NOTE: there is no `mode` and no `username` field. Full mode is not encoded
// here — it is established server-side via POST /auth/login, which returns a
// `userToken` (JWT) + `user.id` used for the /stremio/:userId/* and /v1/* routes.
export function encodeStremboxdConfig(config: StremboxdPublicConfig): string {
  const json = JSON.stringify(config);
  const utf8 = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeStremboxdConfig(encoded: string): StremboxdPublicConfig | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as StremboxdPublicConfig;
    if (typeof parsed !== "object" || !parsed.c || !Array.isArray(parsed.l)) return null;
    return parsed;
  } catch {
    return null;
  }
}
