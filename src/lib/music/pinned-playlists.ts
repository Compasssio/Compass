import { useSyncExternalStore } from "react";
import { readLocalJson, writeLocalJson } from "./local-store";

export type MusicPinnedPlaylist = {
  id: string;
  name: string;
  artwork: string[];
  /** Spotify playlists open in the Spotify library instead of a Compass playlist page. */
  spotify?: boolean;
  at: number;
};

const STORE = "pinned-playlists";
const LIMIT = 12;

let list: MusicPinnedPlaylist[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

export async function hydratePinnedMusicPlaylists(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await readLocalJson<MusicPinnedPlaylist[]>(STORE);
  if (Array.isArray(saved)) {
    list = saved
      .filter((entry) => entry && entry.id && entry.name)
      .slice(0, LIMIT)
      .map((entry) => ({ ...entry, artwork: entry.artwork ?? [] }));
  }
  notify();
}

export function getPinnedMusicPlaylists(): MusicPinnedPlaylist[] {
  return list;
}

export function isMusicPlaylistPinned(id: string): boolean {
  return list.some((entry) => entry.id === id);
}

export function pinMusicPlaylist(entry: Omit<MusicPinnedPlaylist, "at">): void {
  const id = entry.id?.trim();
  const name = entry.name?.trim();
  if (!id || !name) return;
  list = [
    { ...entry, id, name, artwork: entry.artwork.filter(Boolean).slice(0, 4), at: Date.now() },
    ...list.filter((current) => current.id !== id),
  ].slice(0, LIMIT);
  writeLocalJson(STORE, list);
  notify();
}

export function unpinMusicPlaylist(id: string): void {
  if (!list.some((entry) => entry.id === id)) return;
  list = list.filter((entry) => entry.id !== id);
  writeLocalJson(STORE, list);
  notify();
}

/** Keeps the row order; a rename must not reshuffle the shelf. */
export function renamePinnedMusicPlaylist(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed || !list.some((entry) => entry.id === id)) return;
  list = list.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry));
  writeLocalJson(STORE, list);
  notify();
}

export function usePinnedMusicPlaylists(): MusicPinnedPlaylist[] {
  return useSyncExternalStore(subscribe, getPinnedMusicPlaylists, getPinnedMusicPlaylists);
}

export function useMusicPlaylistPinned(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isMusicPlaylistPinned(id),
    () => false,
  );
}
