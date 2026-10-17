import { useRef, useState, type MouseEvent } from "react";
import { ChevronRight, ImageDown, Play, UserRound } from "@/components/icons/music-icons";
import { coverCardTitle } from "@/components/music/music-cover-card";
import { useMusicNavigate } from "@/components/music/music-navigate";
import { useMusicPlaylistPicker } from "@/components/music/music-playlist-picker";
import {
  MusicTrackMenu,
  useMusicTrackMenuItems,
  type MusicTrackMenuItem,
} from "@/components/music/music-track-menu";
import { useT } from "@/lib/i18n";
import { enqueueMusic, toggleMusicLiked } from "@/lib/music/player";
import { saveArtwork } from "@/lib/music/artwork-save";
import {
  pinMusicPlaylist,
  unpinMusicPlaylist,
  useMusicPlaylistPinned,
} from "@/lib/music/pinned-playlists";
import { Pin, PinOff } from "lucide-react";
import type { MusicCatalogItem } from "@/lib/music/types";

type Handlers = {
  onPlay?: (item: MusicCatalogItem, index: number) => void;
  onOpen?: (item: MusicCatalogItem, index: number) => void;
};

type Copy = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Compass's generic item entries: the same list wherever one catalog item
 * appears, so a card menu never drifts from a row menu.
 */
export function musicItemMenuItems({
  t,
  item,
  pinned = false,
  onPlay,
  onOpen,
  onTogglePin,
  onGoToArtist,
}: {
  t: Copy;
  item: MusicCatalogItem;
  pinned?: boolean;
  onPlay?: () => void;
  onOpen?: () => void;
  onTogglePin?: () => void;
  onGoToArtist?: () => void;
}): MusicTrackMenuItem[] {
  const items: MusicTrackMenuItem[] = [];
  if (onPlay)
    items.push({ id: "play", label: t("music.play"), icon: <Play size={14} />, run: onPlay });
  if (onOpen)
    items.push({
      id: "open",
      label: t("music.card.openItem", { title: coverCardTitle(item) }),
      icon: <ChevronRight size={14} className="dir-icon" />,
      run: onOpen,
    });
  if (onTogglePin)
    items.push({
      id: "pin",
      label: t(pinned ? "music.playlist.unpin" : "music.playlist.pin"),
      icon: pinned ? <PinOff size={14} /> : <Pin size={14} />,
      run: onTogglePin,
    });
  if (onGoToArtist)
    items.push({
      id: "artist",
      label: t("music.card.goToArtist"),
      icon: <UserRound size={14} />,
      run: onGoToArtist,
    });
  if (item.artwork) {
    const art = Array.isArray(item.artwork) ? item.artwork[0] : item.artwork;
    const name = coverCardTitle(item);
    const by = "artist" in item ? (item.artist ?? "") : "";
    items.push({
      id: "artwork",
      label: t("music.artwork.save"),
      icon: <ImageDown size={14} />,
      run: async () => {
        await saveArtwork(art, name, by);
      },
    });
  }
  return items;
}

/** A generated mix, saved songs or any context tile: play it or open its page. */
export function musicPlayOpenMenuItems({
  t,
  name,
  onPlay,
  onOpen,
}: {
  t: Copy;
  name: string;
  onPlay?: () => void;
  onOpen?: () => void;
}): MusicTrackMenuItem[] {
  const items: MusicTrackMenuItem[] = [];
  if (onPlay)
    items.push({ id: "play", label: t("music.play"), icon: <Play size={14} />, run: onPlay });
  if (onOpen)
    items.push({
      id: "open",
      label: t("music.card.openItem", { title: name }),
      icon: <ChevronRight size={14} className="dir-icon" />,
      run: onOpen,
    });
  return items;
}

export function useMusicItemMenu(handlers: Handlers) {
  const t = useT();
  const { goToArtist } = useMusicNavigate();
  const { openPlaylistPicker } = useMusicPlaylistPicker();
  const anchor = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<{
    item: MusicCatalogItem;
    index: number;
    position: { x: number; y: number } | null;
  } | null>(null);

  const item = target?.item ?? null;
  const index = target?.index ?? 0;
  const track = item?.kind === "track" ? item : null;
  // Only Compass's own playlists have a playlist page to pin; catalog playlists
  // live in whichever service they came from.
  const localPlaylist =
    item?.kind === "playlist" && item.connectorId === "local" ? item : null;
  const pinned = useMusicPlaylistPinned(localPlaylist?.id ?? "");
  const trackItems = useMusicTrackMenuItems(track, {
    onPlay: handlers.onPlay && track ? () => handlers.onPlay?.(track, index) : undefined,
    onToggleLike: track ? () => toggleMusicLiked(track) : undefined,
    onAddToQueue: track ? () => enqueueMusic(track) : undefined,
    onAddToPlaylist: track ? () => openPlaylistPicker(track) : undefined,
    onGoToArtist: track ? () => goToArtist(track.artist, track) : undefined,
  });

  let items: MusicTrackMenuItem[] = [];
  if (track) {
    items = trackItems;
  } else if (item) {
    items = musicItemMenuItems({
      t,
      item,
      pinned,
      onPlay: handlers.onPlay ? () => handlers.onPlay?.(item, index) : undefined,
      onOpen: handlers.onOpen ? () => handlers.onOpen?.(item, index) : undefined,
      onTogglePin: localPlaylist
        ? () => {
            if (pinned) {
              unpinMusicPlaylist(localPlaylist.id);
              return;
            }
            pinMusicPlaylist({
              id: localPlaylist.id,
              name: localPlaylist.name,
              artwork: localPlaylist.artwork,
            });
          }
        : undefined,
      onGoToArtist: item.kind === "album" ? () => goToArtist(item.artist) : undefined,
    });
  }

  const open = (item: MusicCatalogItem, index: number, event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")
      : null;
    anchor.current = target && event.currentTarget.contains(target) ? target : event.currentTarget;
    setTarget({
      item,
      index,
      position:
        event.type === "contextmenu" && (event.clientX !== 0 || event.clientY !== 0)
          ? { x: event.clientX, y: event.clientY }
          : null,
    });
  };
  const close = () => setTarget(null);

  return {
    open,
    close,
    openFor: (item: MusicCatalogItem, index = 0) => (event: MouseEvent<HTMLElement>) =>
      open(item, index, event),
    isOpen: target !== null,
    menu: (
      <MusicTrackMenu
        anchorRef={anchor}
        open={target !== null && items.length > 0}
        onClose={close}
        items={items}
        position={target?.position}
      />
    ),
  };
}
