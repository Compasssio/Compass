import { invoke } from "@tauri-apps/api/core";
import { addTracksToMusicPlaylist, createMusicPlaylist, deleteMusicPlaylist } from "./library";
import type { MusicPlaylist, MusicPlaylistRef, MusicTrack } from "./types";

export type SpotifyLibraryKind = "liked" | "playlists" | "playlist";
export type SpotifyLibraryPlaylist = MusicPlaylistRef & { canRead: boolean; editable: boolean };
export type SpotifyLibraryPage = {
  tracks: MusicTrack[];
  trackAddedAt?: Record<string, string>;
  playlists: SpotifyLibraryPlaylist[];
  nextOffset: number | null;
  total: number | null;
  skipped: number;
  canCreate: boolean;
  writePermission: boolean;
};

export function loadSpotifyLibraryPage(
  kind: SpotifyLibraryKind,
  offset = 0,
  playlistId?: string,
): Promise<SpotifyLibraryPage> {
  return invoke("music_spotify_library_page", { kind, offset, playlistId });
}

export function createSpotifyPlaylist(name: string): Promise<SpotifyLibraryPlaylist> {
  return invoke("music_spotify_create_playlist", { name: name.trim() });
}

export function spotifyTrackUri(track: MusicTrack): string | null {
  return (
    [track.sourceId, track.id].find(
      (value) => value && /^spotify:track:[a-zA-Z0-9]{22}$/.test(value),
    ) ?? null
  );
}

export async function addTrackToSpotifyPlaylist(
  playlistId: string,
  track: MusicTrack,
): Promise<void> {
  const trackUri = spotifyTrackUri(track);
  if (!trackUri) throw new Error("Only Spotify tracks can be added to a Spotify playlist");
  await invoke("music_spotify_add_to_playlist", { playlistId, trackUri });
  window.dispatchEvent(new Event("compass:spotify-library-changed"));
}

export async function removeTrackFromSpotifyPlaylist(
  playlistId: string,
  track: MusicTrack,
): Promise<void> {
  const trackUri = spotifyTrackUri(track);
  if (!trackUri) throw new Error("Only Spotify tracks can be removed from a Spotify playlist");
  await invoke("music_spotify_remove_from_playlist", { playlistId, trackUri });
  window.dispatchEvent(new Event("compass:spotify-library-changed"));
}

export async function renameSpotifyPlaylist(playlistId: string, name: string): Promise<void> {
  await invoke("music_spotify_rename_playlist", { playlistId, name: name.trim() });
  window.dispatchEvent(new Event("compass:spotify-library-changed"));
}

export async function setSpotifyPlaylistCover(
  playlistId: string,
  imageBase64: string,
): Promise<void> {
  await invoke("music_spotify_set_playlist_cover", { playlistId, imageBase64 });
  window.dispatchEvent(new Event("compass:spotify-library-changed"));
}

/**
 * Finds one playlist in the account's list, walking the pages while it stays
 * unfound. Bounded so a deep library cannot turn one lookup into endless calls.
 */
export async function loadSpotifyPlaylist(
  playlistId: string,
): Promise<SpotifyLibraryPlaylist | null> {
  let offset = 0;
  for (let page = 0; page < 10; page += 1) {
    const result = await loadSpotifyLibraryPage("playlists", offset);
    const found = result.playlists.find((playlist) => playlist.id === playlistId);
    if (found) return found;
    if (result.nextOffset === null) return null;
    offset = result.nextOffset;
  }
  return null;
}

export async function spotifyPlaylistContainsTrack(
  playlistId: string,
  track: MusicTrack,
): Promise<boolean> {
  const uri = spotifyTrackUri(track);
  if (!uri) return false;

  let offset = 0;
  for (;;) {
    const page = await loadSpotifyLibraryPage("playlist", offset, playlistId);
    if (page.tracks.some((item) => spotifyTrackUri(item) === uri)) return true;
    if (page.nextOffset === null) return false;
    if (
      !Number.isSafeInteger(page.nextOffset) ||
      page.nextOffset <= offset ||
      page.nextOffset > 100_000
    ) {
      throw new Error("Spotify returned invalid playlist pagination");
    }
    offset = page.nextOffset;
  }
}

export async function importSpotifyCollection({
  kind,
  playlistId,
  name,
  signal,
  onProgress,
}: {
  kind: "liked" | "playlist";
  playlistId?: string;
  name: string;
  signal?: AbortSignal;
  onProgress?: (count: number) => void;
}): Promise<{ playlist: MusicPlaylist; skipped: number }> {
  const tracks: MusicTrack[] = [];
  let offset = 0;
  let skipped = 0;
  for (;;) {
    signal?.throwIfAborted();
    const page = await loadSpotifyLibraryPage(kind, offset, playlistId);
    signal?.throwIfAborted();
    tracks.push(...page.tracks);
    skipped += page.skipped;
    onProgress?.(tracks.length);
    if (page.nextOffset === null) break;
    if (
      !Number.isSafeInteger(page.nextOffset) ||
      page.nextOffset <= offset ||
      page.nextOffset > 100_000
    ) {
      throw new Error("Spotify returned invalid library pagination");
    }
    offset = page.nextOffset;
  }
  signal?.throwIfAborted();
  if (tracks.length === 0) throw new Error("Spotify collection has no importable tracks");
  // Read the complete collection before creating anything in Compass. A failed
  // page or cancellation cannot leave a misleading partial import.
  const created = await createMusicPlaylist(name);
  let playlist: MusicPlaylist;
  try {
    signal?.throwIfAborted();
    playlist = await addTracksToMusicPlaylist(created.id, tracks);
  } catch (error) {
    // Only this operation's new empty playlist is eligible for cleanup.
    await deleteMusicPlaylist(created.id).catch(() => {});
    throw error;
  }
  skipped += Math.max(0, tracks.length - playlist.tracks.length);
  window.dispatchEvent(new Event("compass:music-library-changed"));
  return { playlist, skipped };
}

export function spotifyLibraryErrorKey(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (message.includes("permission is missing")) return "music.spotifyLibrary.permission";
  if (message.includes("sign in expired") || message.includes("connect spotify premium"))
    return "music.spotifyLibrary.reconnectNeeded";
  if (message.includes("did not confirm") || message.includes("created the playlist but"))
    return "music.spotifyLibrary.unconfirmed";
  if (message.includes("refused this request") || message.includes("only playlists you own"))
    return "music.spotifyLibrary.restricted";
  if (message.includes("rate limiting")) return "music.spotifyLibrary.rateLimit";
  if (message.includes("no importable tracks")) return "music.spotifyLibrary.noImportable";
  if (message.includes("only spotify tracks")) return "music.spotifyLibrary.spotifyTrackOnly";
  return "music.spotifyLibrary.error";
}
