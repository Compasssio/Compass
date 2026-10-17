import { invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

export type TrickplayState = { active: boolean; bufferedOnly: boolean };
const IDLE: TrickplayState = { active: false, bufferedOnly: false };
let state: TrickplayState = IDLE;
const listeners = new Set<() => void>();

export function setTrickplayState(next: TrickplayState): void {
  if (state.active === next.active && state.bufferedOnly === next.bufferedOnly) return;
  state = next;
  for (const l of listeners) l();
}

export function useTrickplayState(): TrickplayState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => IDLE,
  );
}

const thumbCache = new Map<number, string>();

export function thumbCacheGet(bucket: number): string | undefined {
  return thumbCache.get(bucket);
}

export function thumbCacheSet(bucket: number, dataUri: string): void {
  thumbCache.set(bucket, dataUri);
}

export function thumbCacheNearest(bucket: number, maxDistance: number): string | undefined {
  const exact = thumbCache.get(bucket);
  if (exact) return exact;
  let best: string | undefined;
  let bestDist = Infinity;
  for (const [b, uri] of thumbCache) {
    const d = Math.abs(b - bucket);
    if (d < bestDist) {
      best = uri;
      bestDist = d;
    }
  }
  return bestDist <= maxDistance ? best : undefined;
}

export async function trickplaySetUrl(url: string): Promise<void> {
  thumbCache.clear();
  try {
    await invoke("thumbs_set_url", { url });
  } catch {}
}

export async function trickplaySpawnEager(): Promise<void> {
  try {
    await invoke("thumbs_spawn_eager");
  } catch {}
}

export async function trickplayGet(timeSec: number): Promise<string | null> {
  try {
    return await invoke<string | null>("thumbs_get", { timeSec });
  } catch {
    return null;
  }
}

export async function trickplayStop(): Promise<void> {
  thumbCache.clear();
  try {
    await invoke("thumbs_stop");
  } catch {}
}
