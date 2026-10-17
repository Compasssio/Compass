import type { RoomSnapshot } from "./client";
import type { EpisodeRef, SourceDescriptor } from "./protocol";

export type HostSourceInfo = {
  descriptor: SourceDescriptor;
  mediaId: string | null;
  episode: EpisodeRef | null;
};

export type LastInviteMeta = {
  key: string;
  at: number;
  proto: number;
  guestPick: boolean;
};

export function deriveHostSource(snapshot: RoomSnapshot): HostSourceInfo | null {
  const s = snapshot.syncState;
  if (!s?.source) return null;
  if (!snapshot.hostClientId || s.updatedBy !== snapshot.hostClientId) return null;
  return { descriptor: s.source, mediaId: s.mediaId, episode: s.episode ?? null };
}

export function hostSourceMatchesMedia(
  info: HostSourceInfo | null,
  mediaId: string,
  episode?: { season: number; episode: number } | null,
): boolean {
  if (!info || info.mediaId !== mediaId) return false;
  const he = info.episode;
  if (!!he !== !!episode) return false;
  if (he && episode && (he.season !== episode.season || he.episode !== episode.episode)) {
    return false;
  }
  return true;
}

export function deriveRoomGuestPick(
  snapshot: RoomSnapshot,
  clientId: string,
  lastInvite: LastInviteMeta | null,
): boolean {
  if (!snapshot.hostClientId || snapshot.hostClientId === clientId) return false;
  const s = snapshot.syncState;
  const stateAt = s && s.updatedBy === snapshot.hostClientId ? s.updatedAt : 0;
  const inviteAt = lastInvite?.at ?? 0;
  if (stateAt === 0 && inviteAt === 0) return false;
  if (inviteAt >= stateAt) return lastInvite?.guestPick === true;
  return s?.guestPick === true;
}
