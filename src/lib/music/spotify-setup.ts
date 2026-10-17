import { invoke } from "@tauri-apps/api/core";

// Keep in sync with REDIRECT_PORT and redirect_uri in src-tauri/src/music/spotify/auth.rs.
export const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8898/login";
export const SPOTIFY_DASHBOARD_URL = "https://developer.spotify.com/dashboard";

export type SpotifyDevicePrompt = {
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
  expiresIn: number;
  interval: number;
};

export type SpotifyDevicePoll =
  | { state: "pending"; interval: number }
  | { state: "slowDown"; interval: number }
  | { state: "connected" };

/** Starts Spotify's device pairing; the prompt carries the code the user enters at spotify.com/pair. */
export function startSpotifyDevicePairing(): Promise<SpotifyDevicePrompt> {
  return invoke("music_spotify_device_start");
}

/** One pairing poll. Poll no faster than the returned interval until the state flips. */
export function pollSpotifyDevicePairing(): Promise<SpotifyDevicePoll> {
  return invoke("music_spotify_device_poll");
}

export function cancelSpotifyDevicePairing(): Promise<void> {
  return invoke("music_spotify_device_cancel");
}

/**
 * Browsing-only sign in with the listener's own Spotify app: the Web API keeps working for
 * developer apps and gives browsing a private rate quota. Playback stays on the paired
 * session, which this never touches.
 */
export function connectSpotifyBrowsing(clientId?: string): Promise<void> {
  return invoke("music_spotify_browse_connect", { clientId: clientId?.trim() || null });
}

/** Replace backend setup instructions with localized, actionable form guidance. */
export function spotifySetupErrorKey(error: string): string | null {
  if (error.includes("Spotify needs your own client id")) return "music.spotifySetup.missingSaved";
  if (error.includes("Spotify rejected that client id")) return "music.spotifySetup.rejected";
  return null;
}
