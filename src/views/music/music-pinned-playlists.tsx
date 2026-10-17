import { useRef, useState, type MouseEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { MusicCoverCard } from "@/components/music/music-cover-card";
import { MusicPlaylistEditDialog, type PlaylistEditTarget } from "@/components/music/music-playlist-edit-dialog";
import {
  compassPlaylistMenuItems,
  spotifyPlaylistMenuItems,
} from "@/components/music/music-playlist-menu-items";
import { MusicTrackMenu, type MusicTrackMenuItem } from "@/components/music/music-track-menu";
import { Row } from "@/components/row";
import { deleteMusicPlaylist, exportMusicM3u, listMusicPlaylists } from "@/lib/music/library";
import { recordMusicPlaylistPlayback } from "@/lib/music/playback-origin";
import {
  renamePinnedMusicPlaylist,
  unpinMusicPlaylist,
  useMusicPlaylistPinned,
  usePinnedMusicPlaylists,
  type MusicPinnedPlaylist,
} from "@/lib/music/pinned-playlists";
import {
  importSpotifyCollection,
  loadSpotifyPlaylist,
  type SpotifyLibraryPlaylist,
} from "@/lib/music/spotify-library";
import { openUrl } from "@/lib/window";
import type { MusicCatalogItem } from "@/lib/music/types";
import type { MusicBand, MusicBandContext } from "./music-band-types";

const SHELF_MIN = 160;

function asPlaylistItem(entry: MusicPinnedPlaylist): MusicCatalogItem {
  return {
    kind: "playlist",
    id: entry.id,
    connectorId: entry.spotify ? "spotify" : "catalog",
    name: entry.name,
    artwork: entry.artwork,
  };
}

function playlistFilename(name: string): string {
  const safe = name
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${safe || "playlist"}.m3u`;
}

function PinnedToHome({ ctx, title }: { ctx: MusicBandContext; title: string }) {
  const t = ctx.t;
  const pinned = usePinnedMusicPlaylists();
  const anchor = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<{
    entry: MusicPinnedPlaylist;
    x: number;
    y: number;
  } | null>(null);
  const [spotifyInfo, setSpotifyInfo] = useState<SpotifyLibraryPlaylist | null>(null);
  const [editTarget, setEditTarget] = useState<PlaylistEditTarget | null>(null);
  const pinnedHere = useMusicPlaylistPinned(target?.entry.id ?? "");

  const openEntry = (entry: MusicPinnedPlaylist) => {
    if (entry.spotify) {
      ctx.openLibrary({ view: "spotify", spotifyKind: "playlists", playlistId: entry.id });
      return;
    }
    ctx.openLibrary({ view: "playlists", playlistId: entry.id });
  };

  const compassPlaylist = async (id: string) =>
    (await listMusicPlaylists()).find((playlist) => playlist.id === id) ?? null;

  const playEntry = async (entry: MusicPinnedPlaylist) => {
    const playlist = await compassPlaylist(entry.id);
    const first = playlist?.tracks[0];
    if (!playlist || !first) return;
    recordMusicPlaylistPlayback(playlist, playlist.tracks);
    ctx.playTrack(first, playlist.tracks);
  };

  const exportEntry = async (entry: MusicPinnedPlaylist) => {
    const playlist = await compassPlaylist(entry.id);
    if (!playlist?.tracks.length) return;
    const path = await save({
      defaultPath: playlistFilename(playlist.name),
      filters: [{ name: t("music.m3u.playlist"), extensions: ["m3u"] }],
    });
    if (typeof path !== "string") return;
    await exportMusicM3u(playlist.id, path);
  };

  const deleteEntry = async (entry: MusicPinnedPlaylist) => {
    if (!window.confirm(t("music.playlist.deleteConfirm"))) return;
    await deleteMusicPlaylist(entry.id);
    unpinMusicPlaylist(entry.id);
  };

  const importEntry = async (entry: MusicPinnedPlaylist) => {
    await importSpotifyCollection({ kind: "playlist", playlistId: entry.id, name: entry.name });
  };

  const editEntry = async (entry: MusicPinnedPlaylist) => {
    if (entry.spotify) {
      const found = spotifyInfo ?? (await loadSpotifyPlaylist(entry.id));
      if (!found) return;
      setEditTarget({ id: found.id, name: found.name, artwork: found.artwork, spotify: true });
      return;
    }
    const playlist = await compassPlaylist(entry.id);
    setEditTarget({
      id: entry.id,
      name: playlist?.name ?? entry.name,
      artwork: playlist?.tracks.map((track) => track.artwork) ?? entry.artwork,
    });
  };

  const openMenu = (entry: MusicPinnedPlaylist) => (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    anchor.current = event.currentTarget;
    setSpotifyInfo(null);
    setTarget({ entry, x: event.clientX, y: event.clientY });
    if (entry.spotify) {
      // Editable is only known from the account's playlist list, so fetch the
      // record the same way the library does and let the menu fill in.
      void loadSpotifyPlaylist(entry.id).then(setSpotifyInfo).catch(() => setSpotifyInfo(null));
    }
  };

  const items: MusicTrackMenuItem[] = target
    ? target.entry.spotify
      ? spotifyPlaylistMenuItems({
          t,
          name: target.entry.name,
          pinned: pinnedHere,
          editable: Boolean(spotifyInfo?.editable),
          onOpen: () => openEntry(target.entry),
          onEdit: () => void editEntry(target.entry),
          onTogglePin: () => unpinMusicPlaylist(target.entry.id),
          onImport: () => void importEntry(target.entry),
          onOpenInSpotify: () =>
            openUrl(`https://open.spotify.com/playlist/${target.entry.id.split(":").pop()}`),
        })
      : compassPlaylistMenuItems({
          t,
          name: target.entry.name,
          pinned: pinnedHere,
          onPlay: () => void playEntry(target.entry),
          onOpen: () => openEntry(target.entry),
          onEdit: () => void editEntry(target.entry),
          onRename: () => void editEntry(target.entry),
          onTogglePin: () => unpinMusicPlaylist(target.entry.id),
          onExport: () => void exportEntry(target.entry),
          onDelete: () => void deleteEntry(target.entry),
        })
    : [];

  if (!pinned.length) return null;

  const head = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="truncate text-[17px] font-medium tracking-tight text-ink">{title}</span>
    </span>
  );

  return (
    <>
      <Row title={head} shape="square" min={SHELF_MIN} scrollKey="music:pinned-to-home">
        {pinned.map((entry) => (
          <MusicCoverCard
            key={entry.id}
            item={asPlaylistItem(entry)}
            subtitle={entry.spotify ? "Spotify" : t("music.playlists")}
            onOpen={() => openEntry(entry)}
            onMenu={openMenu(entry)}
          />
        ))}
      </Row>
      <MusicTrackMenu
        anchorRef={anchor}
        open={target !== null}
        onClose={() => {
          setTarget(null);
          setSpotifyInfo(null);
        }}
        items={items}
        position={target ? { x: target.x, y: target.y } : null}
      />
      {editTarget && (
        <MusicPlaylistEditDialog
          key={editTarget.id}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(name) => renamePinnedMusicPlaylist(editTarget.id, name)}
        />
      )}
    </>
  );
}

export function pinnedPlaylistsBand(ctx: MusicBandContext): MusicBand {
  return {
    key: "music:pinned-to-home",
    title: ctx.t("music.pinned.title"),
    catalog: false,
    render: (title) => <PinnedToHome ctx={ctx} title={title} />,
  };
}
