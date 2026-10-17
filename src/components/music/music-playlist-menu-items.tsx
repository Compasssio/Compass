import {
  ChevronRight,
  ExternalLink,
  FileDown,
  Play,
  PlaylistRename,
  SlidersHorizontal,
  Trash2,
} from "@/components/icons/music-icons";
import { Pin, PinOff } from "lucide-react";
import type { MusicTrackMenuItem } from "./music-track-menu";

type Copy = (key: string, vars?: Record<string, string | number>) => string;

/** Compass's own playlist: the same entries wherever the playlist appears. */
export function compassPlaylistMenuItems({
  t,
  name,
  pinned,
  onPlay,
  onOpen,
  onEdit,
  onRename,
  onTogglePin,
  onExport,
  onDelete,
}: {
  t: Copy;
  name: string;
  pinned: boolean;
  onPlay?: () => void;
  onOpen?: () => void;
  onEdit?: () => void;
  onRename?: () => void;
  onTogglePin?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
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
  if (onEdit)
    items.push({
      id: "edit",
      label: t("music.playlist.edit"),
      icon: <SlidersHorizontal size={14} />,
      run: onEdit,
    });
  if (onRename)
    items.push({
      id: "rename",
      label: t("music.playlist.rename"),
      icon: <PlaylistRename size={14} />,
      run: onRename,
    });
  if (onTogglePin)
    items.push({
      id: "pin",
      label: t(pinned ? "music.playlist.unpin" : "music.playlist.pin"),
      icon: pinned ? <PinOff size={14} /> : <Pin size={14} />,
      run: onTogglePin,
    });
  if (onExport)
    items.push({
      id: "export",
      label: t("music.m3u.export"),
      icon: <FileDown size={14} />,
      run: onExport,
    });
  if (onDelete)
    items.push({
      id: "delete",
      label: t("music.playlist.delete"),
      icon: <Trash2 size={14} />,
      run: onDelete,
    });
  return items;
}

/** A Spotify playlist the account can see, editable or not. */
export function spotifyPlaylistMenuItems({
  t,
  name,
  pinned,
  editable,
  onOpen,
  onEdit,
  onTogglePin,
  onImport,
  onOpenInSpotify,
}: {
  t: Copy;
  name: string;
  pinned: boolean;
  editable: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onTogglePin?: () => void;
  onImport?: () => void;
  onOpenInSpotify?: () => void;
}): MusicTrackMenuItem[] {
  const items: MusicTrackMenuItem[] = [];
  if (onOpen)
    items.push({
      id: "open",
      label: t("music.card.openItem", { title: name }),
      icon: <ChevronRight size={14} className="dir-icon" />,
      run: onOpen,
    });
  if (onEdit && editable)
    items.push({
      id: "edit",
      label: t("music.playlist.edit"),
      icon: <SlidersHorizontal size={14} />,
      run: onEdit,
    });
  if (onTogglePin)
    items.push({
      id: "pin",
      label: t(pinned ? "music.playlist.unpin" : "music.playlist.pin"),
      icon: pinned ? <PinOff size={14} /> : <Pin size={14} />,
      run: onTogglePin,
    });
  if (onImport)
    items.push({
      id: "import",
      label: t("music.spotifyLibrary.import"),
      icon: <FileDown size={14} />,
      run: onImport,
    });
  if (onOpenInSpotify)
    items.push({
      id: "open-in-spotify",
      label: t("music.spotifyLibrary.open"),
      icon: <ExternalLink size={14} />,
      run: onOpenInSpotify,
    });
  return items;
}
