import { invoke } from "@tauri-apps/api/core";
import type { MusicTrack } from "./types";

export type MusicDeckState = {
  deck: number;
  live: boolean;
  paused: boolean;
  trackId: string | null;
  connectorId: string | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
  volume: number;
  gain: number;
};

export type MusicDeckSnapshot = {
  decks: MusicDeckState[];
  primary: number;
};

/**
 * The engine that is actually on air. A page reload leaves it running while the interface
 * restores a checkpoint, so this is the truth the restored state has to be reconciled with.
 */
export type MusicEngineState = {
  engine: string;
  live: boolean;
  paused: boolean;
  deck: number | null;
  trackId: string | null;
  connectorId: string | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
};

const IDLE_ENGINE: MusicEngineState = {
  engine: "none",
  live: false,
  paused: true,
  deck: null,
  trackId: null,
  connectorId: null,
  positionSeconds: null,
  durationSeconds: null,
};

export type VirtualAudioDevice = {
  name: string;
  description: string;
  kind: string;
  product: string;
};

export type BroadcastTargets = {
  devices: VirtualAudioDevice[];
  installProduct: string;
  installUrl: string;
};

export type BroadcastStatus = {
  active: boolean;
  device: string | null;
  product: string | null;
  trackId: string | null;
  driftMs: number | null;
};

const IDLE_STATE: MusicDeckState = {
  deck: 1,
  live: false,
  paused: true,
  trackId: null,
  connectorId: null,
  positionSeconds: null,
  durationSeconds: null,
  volume: 1,
  gain: 0,
};

export const IDLE_BROADCAST: BroadcastStatus = {
  active: false,
  device: null,
  product: null,
  trackId: null,
  driftMs: null,
};

export function deckPlay(deck: number, track: MusicTrack, volume?: number): Promise<void> {
  return invoke("music_deck_play", { deck, track, volume });
}

export function deckVolume(deck: number, volume: number): Promise<void> {
  return invoke("music_deck_volume", { deck, volume });
}

export function deckPause(deck: number, paused: boolean): Promise<void> {
  return invoke("music_deck_pause", { deck, paused });
}

export function deckSeek(deck: number, position: number): Promise<void> {
  return invoke("music_deck_seek", { deck, position });
}

export function deckStop(deck: number): Promise<void> {
  return invoke("music_deck_stop", { deck });
}

export async function deckSnapshot(): Promise<MusicDeckSnapshot> {
  try {
    const snapshot = await invoke<MusicDeckSnapshot>("music_deck_states");
    const decks = snapshot.decks;
    return {
      decks: Array.isArray(decks) && decks.length === 2 ? decks : [IDLE_STATE, IDLE_STATE],
      primary: snapshot.primary === 1 ? 1 : 0,
    };
  } catch {
    return { decks: [IDLE_STATE, IDLE_STATE], primary: 0 };
  }
}

export async function deckStates(): Promise<MusicDeckState[]> {
  return (await deckSnapshot()).decks;
}

export async function engineSnapshot(): Promise<MusicEngineState> {
  try {
    const snapshot = await invoke<MusicEngineState>("music_engine_state");
    const position = snapshot?.positionSeconds;
    const duration = snapshot?.durationSeconds;
    return {
      engine: typeof snapshot?.engine === "string" ? snapshot.engine : "none",
      live: snapshot?.live === true,
      paused: snapshot?.paused !== false,
      deck: snapshot?.deck === 1 ? 1 : snapshot?.deck === 0 ? 0 : null,
      trackId: typeof snapshot?.trackId === "string" ? snapshot.trackId : null,
      connectorId: typeof snapshot?.connectorId === "string" ? snapshot.connectorId : null,
      positionSeconds: typeof position === "number" && Number.isFinite(position) ? position : null,
      durationSeconds: typeof duration === "number" && Number.isFinite(duration) ? duration : null,
    };
  } catch {
    return IDLE_ENGINE;
  }
}

export function setPrimaryDeck(deck: number): Promise<boolean> {
  return invoke("music_deck_primary", { deck });
}

export function setCrossfade(position: number): Promise<void> {
  return invoke("music_deck_crossfade", { position });
}

export async function getCrossfade(): Promise<number> {
  try {
    return await invoke<number>("music_deck_crossfade_get");
  } catch {
    return -1;
  }
}

export async function broadcastTargets(): Promise<BroadcastTargets> {
  try {
    return await invoke<BroadcastTargets>("music_broadcast_targets");
  } catch {
    return { devices: [], installProduct: "", installUrl: "" };
  }
}

export function broadcastStart(device: string | null): Promise<BroadcastStatus> {
  return invoke("music_broadcast_start", { device });
}

export function broadcastStop(): Promise<BroadcastStatus> {
  return invoke("music_broadcast_stop");
}

export async function broadcastStatus(): Promise<BroadcastStatus> {
  try {
    return await invoke<BroadcastStatus>("music_broadcast_status");
  } catch {
    return IDLE_BROADCAST;
  }
}
