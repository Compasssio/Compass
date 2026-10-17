import type { TrackInfo } from "../bridge";
import type { AudioTrackList } from "./types";

export function bufferedAhead(v: HTMLVideoElement): number {
  if (!v.buffered || v.buffered.length === 0) return 0;
  const t = v.currentTime;
  for (let i = 0; i < v.buffered.length; i++) {
    if (t >= v.buffered.start(i) && t <= v.buffered.end(i)) {
      return v.buffered.end(i) - t;
    }
  }
  return 0;
}

export function videoAudio(v: HTMLVideoElement): AudioTrackList | null {
  const x = v as HTMLVideoElement & { audioTracks?: AudioTrackList };
  return x.audioTracks ?? null;
}

export function readAudioTracks(v: HTMLVideoElement): TrackInfo[] {
  const tracks = videoAudio(v);
  if (!tracks) return [];
  const out: TrackInfo[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    out.push({
      id: (t as { id?: string }).id || String(i),
      label: t.label || t.language || `Audio ${i + 1}`,
      lang: t.language || undefined,
      kind: "audio",
      selected: t.enabled,
    });
  }
  return out;
}
