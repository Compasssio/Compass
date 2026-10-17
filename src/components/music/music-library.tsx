import {
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  ChevronRight,
  FileUp,
  FolderOpen,
  LoaderCircle,
  Play,
  Plus,
  Search,
  X,
} from "@/components/icons/music-icons";
import { HoverTooltip } from "@/components/hover-tooltip";
import { Dropdown } from "@/components/dropdown";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import { MusicLocalCollection } from "./music-local-collection";
import { MusicSpotifyLibrary } from "./music-spotify-library";
import { MusicTrackMenu, type MusicTrackMenuItem } from "./music-track-menu";
import { useMusicItemMenu } from "./music-item-menu";
import { MusicPlaylistEditDialog } from "./music-playlist-edit-dialog";
import {
  pinMusicPlaylist,
  renamePinnedMusicPlaylist,
  unpinMusicPlaylist,
  useMusicPlaylistPinned,
} from "@/lib/music/pinned-playlists";
import { compassPlaylistMenuItems } from "./music-playlist-menu-items";
import { useMusicConnections } from "./music-connections";
import { MusicPlaylistGridSkeleton } from "@/components/music/music-skeletons";
import { MusicServiceLogo } from "./music-service-logo";
import { MusicCollectionGrid } from "./music-collection-grid";
import { MusicLibraryEmptyState } from "./music-library-empty-state";
import { useT } from "@/lib/i18n";
import {
  addTracksToMusicPlaylist,
  createMusicPlaylist,
  deleteMusicPlaylist,
  exportMusicM3u,
  importMusicM3u,
  listMusicPlaylists,
  renameMusicPlaylist,
} from "@/lib/music/library";
import { localCollection } from "@/lib/music/catalog";
import {
  arrangeCollections,
  catalogEntry,
  likedEntry,
  playlistEntry,
  recentEntry,
  type MusicCollectionEntry,
  type MusicCollectionSort,
} from "@/lib/music/library-collections";
import { useMusicPlayback } from "@/lib/music/use-music-playback";
import { useMusicCatalogPlayback } from "./use-music-catalog-playback";
import { useMusicSourcePicker } from "./music-source-picker";
import {
  recordMusicLibraryPlayback,
  recordMusicPlaylistPlayback,
} from "@/lib/music/playback-origin";
import type { MusicCatalogItem, MusicPlaylist } from "@/lib/music/types";
import "./music-library.css";

type LibraryFilter = "all" | "playlists" | "albums" | "artists" | "tracks" | "spotify";
const FILTERS: LibraryFilter[] = ["all", "playlists", "albums", "artists", "tracks", "spotify"];
const LOCAL: LibraryFilter[] = ["albums", "artists", "tracks"];

export function MusicLibrary({
  onOpen,
  onCollection,
  onTastes,
  active = true,
  initialView,
  initialSpotifyKind,
  initialSpotifyPlaylistId,
  onSpotifyFocused,
}: {
  onOpen: (item: MusicCatalogItem, siblings: MusicCatalogItem[]) => void;
  onCollection: (entry: MusicCollectionEntry) => void;
  onTastes: () => void;
  active?: boolean;
  initialView?: string;
  initialSpotifyKind?: "playlists" | "liked";
  initialSpotifyPlaylistId?: string;
  onSpotifyFocused?: () => void;
}) {
  const t = useT();
  const { openConnections } = useMusicConnections();
  const player = useMusicPlayback();
  const catalogPlayback = useMusicCatalogPlayback();
  const { openSourcePicker } = useMusicSourcePicker();
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [shelf, setShelf] = useState<MusicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState<LibraryFilter>(() =>
    (FILTERS as string[]).includes(initialView ?? "") ? (initialView as LibraryFilter) : "all",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MusicCollectionSort>("recent");
  const [creating, setCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [contextEntry, setContextEntry] = useState<MusicCollectionEntry | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const contextAnchor = useRef<HTMLElement | null>(null);
  const [renameTarget, setRenameTarget] = useState<MusicPlaylist | null>(null);
  const [editTarget, setEditTarget] = useState<MusicPlaylist | null>(null);
  const contextPlaylistId = contextEntry?.kind === "playlist" ? (contextEntry.playlist?.id ?? "") : "";
  const contextPlaylistPinned = useMusicPlaylistPinned(contextPlaylistId);
  const closeContextMenu = useCallback(() => {
    setContextEntry(null);
    setContextPosition(null);
  }, []);
  const closeRename = useCallback(() => setRenameTarget(null), []);
  const itemMenu = useMusicItemMenu({
    onPlay: (item) => {
      void catalogPlayback.play(item, [item]);
    },
    onOpen: (item) => onOpen(item, [item]),
  });

  useEffect(() => {
    if (initialView && (FILTERS as string[]).includes(initialView))
      setFilter(initialView as LibraryFilter);
  }, [initialView]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReadError(null);
    void listMusicPlaylists()
      .then((next) => {
        if (!cancelled) setPlaylists(next);
      })
      .catch((reason) => {
        if (!cancelled) setReadError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener("compass:music-library-changed", changed);
    return () => window.removeEventListener("compass:music-library-changed", changed);
  }, []);

  // Only the first page of each, so the unified view stays a shelf you can scan rather
  // than the whole local collection, which the Albums and Artists filters already page.
  useEffect(() => {
    if (filter !== "all") return;
    let cancelled = false;
    void Promise.all([
      localCollection("albums", "", 0).catch(() => null),
      localCollection("artists", "", 0).catch(() => null),
    ]).then(([albums, artists]) => {
      if (cancelled) return;
      setShelf([...(albums?.items ?? []), ...(artists?.items ?? [])]);
    });
    return () => {
      cancelled = true;
    };
  }, [filter, revision]);

  const entries = useMemo(() => {
    const built: MusicCollectionEntry[] = [];
    if (player.likedTracks.length > 0)
      built.push(likedEntry(player.likedTracks, t("music.saved"), t("music.library.savedTracks")));
    if (player.recents.length > 0)
      built.push(recentEntry(player.recents, t("music.library.recent"), t("music.library.recent")));
    for (const playlist of playlists) built.push(playlistEntry(playlist, t("music.playlists")));
    if (filter === "all")
      for (const item of shelf) {
        const entry = catalogEntry(item, t("music.connections.local"));
        if (entry) built.push(entry);
      }
    return built;
  }, [player.likedTracks, player.recents, playlists, shelf, filter, t]);

  const arranged = useMemo(
    () => arrangeCollections(entries, filter === "spotify" ? "all" : filter, sort, query),
    [entries, filter, sort, query],
  );

  const createPlaylist = (event: FormEvent) => {
    event.preventDefault();
    const name = playlistName.trim();
    if (!name || working) return;
    setWorking(true);
    setError(null);
    void createMusicPlaylist(name)
      .then((playlist) => {
        setPlaylists((current) => [playlist, ...current.filter((item) => item.id !== playlist.id)]);
        setPlaylistName("");
        setCreating(false);
        setFilter("playlists");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setWorking(false));
  };

  const importM3u = () => {
    if (working) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    void (async () => {
      const path = await open({
        multiple: false,
        filters: [{ name: t("music.m3u.playlist"), extensions: ["m3u", "m3u8"] }],
      });
      if (typeof path !== "string") return;
      const tracks = await importMusicM3u(path);
      const playlist = await createMusicPlaylist(nameFromM3uPath(path, t("music.m3u.imported")));
      const populated = await addTracksToMusicPlaylist(playlist.id, tracks);
      setPlaylists((current) => [populated, ...current.filter((item) => item.id !== populated.id)]);
      setFilter("playlists");
      setNotice(t("music.m3u.importedNotice", { count: tracks.length, name: populated.name }));
    })()
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setWorking(false));
  };

  const playCollection = (entry: MusicCollectionEntry) => {
    const playlist = entry.kind === "playlist" ? entry.playlist : undefined;
    const tracks =
      playlist?.tracks ??
      (entry.kind === "liked"
        ? player.likedTracks
        : entry.kind === "recent"
          ? player.recents
          : []);
    const first = tracks[0];
    if (!first) return;
    if (playlist) recordMusicPlaylistPlayback(playlist, tracks);
    else if (entry.kind === "liked" || entry.kind === "recent")
      recordMusicLibraryPlayback(entry.kind, entry.name, tracks);
    openSourcePicker(first, tracks);
  };

  const exportPlaylist = async (playlist: MusicPlaylist) => {
    if (working) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const path = await save({
        defaultPath: playlistFilename(playlist.name),
        filters: [{ name: t("music.m3u.playlist"), extensions: ["m3u"] }],
      });
      if (typeof path !== "string") return;
      await exportMusicM3u(playlist.id, path);
      setNotice(
        t("music.m3u.exportedNotice", { count: playlist.tracks.length, name: playlist.name }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setWorking(false);
    }
  };

  const removePlaylist = async (playlist: MusicPlaylist) => {
    if (working || !window.confirm(t("music.playlist.deleteConfirm"))) return;
    setWorking(true);
    setError(null);
    try {
      await deleteMusicPlaylist(playlist.id);
      setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
      unpinMusicPlaylist(playlist.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setWorking(false);
    }
  };

  const openEntryMenu = (entry: MusicCollectionEntry, event: MouseEvent<HTMLButtonElement>) => {
    if (entry.item) {
      closeContextMenu();
      itemMenu.close();
      itemMenu.open(entry.item, 0, event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    itemMenu.close();
    contextAnchor.current = event.currentTarget;
    setContextPosition(
      event.clientX !== 0 || event.clientY !== 0
        ? { x: event.clientX, y: event.clientY }
        : null,
    );
    setContextEntry(entry);
  };

  const contextItems: MusicTrackMenuItem[] = [];
  if (contextEntry) {
    const playlist = contextEntry.kind === "playlist" ? contextEntry.playlist : undefined;
    const tracks = playlist?.tracks ??
      (contextEntry.kind === "liked"
        ? player.likedTracks
        : contextEntry.kind === "recent"
          ? player.recents
          : []);
    if (tracks.length) {
      contextItems.push({
        id: "play-collection",
        label: t("music.play"),
        icon: <Play size={14} />,
        run: () => playCollection(contextEntry),
      });
    }
    contextItems.push({
      id: "open-collection",
      label: t("music.card.openItem", { title: contextEntry.name }),
      icon: <ChevronRight size={14} className="dir-icon" />,
      run: () => onCollection(contextEntry),
    });
    if (playlist) {
      contextItems.push(
        ...compassPlaylistMenuItems({
          t,
          name: playlist.name,
          pinned: contextPlaylistPinned,
          onEdit: () => setEditTarget(playlist),
          onRename: () => setRenameTarget(playlist),
          onTogglePin: () => {
            if (contextPlaylistPinned) {
              unpinMusicPlaylist(playlist.id);
              return;
            }
            pinMusicPlaylist({
              id: playlist.id,
              name: playlist.name,
              artwork: playlist.tracks.map((track) => track.artwork).filter(Boolean),
            });
          },
          onExport: playlist.tracks.length ? () => exportPlaylist(playlist) : undefined,
          onDelete: () => removePlaylist(playlist),
        }),
      );
    }
  }

  const updateRenamedPlaylist = useCallback((playlist: MusicPlaylist) => {
    setPlaylists((current) => current.map((item) => item.id === playlist.id ? playlist : item));
    // The pinned shelf keeps a copy of the name; keep it in step.
    renamePinnedMusicPlaylist(playlist.id, playlist.name);
  }, []);

  const grid = filter === "all" || filter === "playlists";
  const filterLabel = (value: LibraryFilter) =>
    value === "spotify"
      ? "Spotify"
      : t(
          value === "all"
            ? "music.library.all"
            : value === "playlists"
              ? "music.playlists"
              : `music.search.${value}`,
        );
  const countFor = (value: LibraryFilter) =>
    value === "playlists" ? playlists.length + (player.likedTracks.length > 0 ? 1 : 0) : 0;

  return (
    <div className="music-library">
      <header className="music-library-header">
        <div>
          <h2>{t("music.library")}</h2>
          <p>{t("music.library.permanent")}</p>
        </div>
        <div className="music-library-actions music-library-header-actions">
          <HoverTooltip label={t("music.home.addFolder")} align="center">
              <button
                type="button"
                className="music-library-icon-action"
                aria-label={t("music.home.addFolder")}
                onClick={() => openConnections("local")}
              >
                <FolderOpen size={28} aria-hidden="true" />
              </button>
          </HoverTooltip>
          <HoverTooltip label={t("music.m3u.import")} align="center">
              <button
                type="button"
                className="music-library-icon-action"
                aria-label={t("music.m3u.import")}
                aria-busy={working}
                disabled={working}
                onClick={importM3u}
              >
                <FileUp size={28} aria-hidden="true" />
              </button>
          </HoverTooltip>
          <HoverTooltip label={t("music.row.newPlaylist")} align="end">
              <button
                type="button"
                className="music-library-icon-action"
                aria-label={t("music.row.newPlaylist")}
                aria-expanded={creating}
                onClick={() => {
                  setFilter("playlists");
                  setCreating((value) => !value);
                }}
              >
                <Plus size={28} aria-hidden="true" />
              </button>
          </HoverTooltip>
        </div>
      </header>

      <div className="music-library-bar">
        <nav className="music-library-views" aria-label={t("music.library")}>
          {FILTERS.map((value) => (
            <button
              type="button"
              key={value}
              data-library-view={value}
              aria-current={filter === value ? "page" : undefined}
              onClick={() => {
                setFilter(value);
                setQuery("");
              }}
            >
              {value === "spotify" && <MusicServiceLogo source="spotify" size={18} />}
              {filterLabel(value)}
              {countFor(value) > 0 && <small>{countFor(value)}</small>}
            </button>
          ))}
        </nav>
        {grid && (
          <div className="music-library-actions">
            <label className="music-library-search">
              <Search size={17} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={200}
                aria-label={t("music.searchLabel")}
                placeholder={t("music.searchPlaceholder")}
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("music.search.clear")}
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <Dropdown
              value={sort}
              onChange={(value) => setSort(value as MusicCollectionSort)}
              options={[
                { value: "recent", label: t("music.sort.recent") },
                { value: "name", label: t("music.sort.name") },
                { value: "size", label: t("music.sort.size") },
              ]}
              ariaLabel={t("music.sort.label")}
              className="music-library-sort"
            />
          </div>
        )}
      </div>

      {creating && (
        <form className="music-library-create" onSubmit={createPlaylist}>
          <input
            autoFocus
            value={playlistName}
            onChange={(event) => setPlaylistName(event.target.value)}
            maxLength={100}
            aria-label={t("music.playlist.nameLabel")}
            placeholder={t("music.playlist.namePlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setCreating(false);
              }
            }}
          />
          <button
            type="submit"
            className="music-library-button"
            disabled={!playlistName.trim() || working}
          >
            {working ? (
              <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Plus size={17} />
            )}
            {t("music.playlist.create")}
          </button>
          <button type="button" className="music-library-text" onClick={() => setCreating(false)}>
            {t("common.cancel")}
          </button>
        </form>
      )}

      {(error || catalogPlayback.error || notice) && (
        <p
          className={`music-library-notice ${
            error || catalogPlayback.error ? "text-danger" : "text-ink-muted"
          }`}
          role={error || catalogPlayback.error ? "alert" : "status"}
        >
          {error ?? catalogPlayback.error ?? notice}
        </p>
      )}
      {readError && grid && (
        <div className="music-library-empty" role="alert">
          <p>{readError}</p>
          <button
            type="button"
            className="music-library-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {grid &&
        (loading ? (
          <MusicPlaylistGridSkeleton />
        ) : (
          <MusicCollectionGrid
            entries={arranged}
            emptyCopy={t(query ? "music.searchEmpty" : "music.playlist.first")}
            emptyState={!query && !readError ? <MusicLibraryEmptyState onConnect={() => openConnections("local")} onTastes={onTastes} /> : undefined}
            onOpen={(entry) => (entry.item ? onOpen(entry.item, shelf) : onCollection(entry))}
            onContextMenu={openEntryMenu}
          />
        ))}
      {LOCAL.includes(filter) && (
        <MusicLocalCollection
          key={filter}
          kind={filter as "albums" | "artists" | "tracks"}
          query=""
          onOpen={onOpen}
          onConnect={() => openConnections("local")}
          onTastes={onTastes}
        />
      )}
      {filter === "spotify" && (
        <MusicSpotifyLibrary
          active={active}
          initialKind={initialSpotifyKind}
          initialPlaylistId={initialSpotifyPlaylistId}
          onFocused={onSpotifyFocused}
          onImported={(playlist) =>
            setPlaylists((current) => [
              playlist,
              ...current.filter((item) => item.id !== playlist.id),
            ])
          }
        />
      )}
      {itemMenu.menu}
      <MusicTrackMenu
        anchorRef={contextAnchor}
        open={contextEntry !== null}
        onClose={closeContextMenu}
        items={contextItems}
        position={contextPosition}
      />
      {renameTarget && (
        <MusicPlaylistRenameDialog
          key={renameTarget.id}
          playlist={renameTarget}
          onClose={closeRename}
          onRenamed={updateRenamedPlaylist}
        />
      )}
      {editTarget && (
        <MusicPlaylistEditDialog
          key={editTarget.id}
          target={{
            id: editTarget.id,
            name: editTarget.name,
            artwork: editTarget.tracks.map((track) => track.artwork),
          }}
          onClose={() => setEditTarget(null)}
          onSaved={(name) => updateRenamedPlaylist({ ...editTarget, name })}
        />
      )}
    </div>
  );
}

function nameFromM3uPath(path: string, fallback: string): string {
  const file = path.split(/[\\/]/).pop() ?? fallback;
  return file.replace(/\.m3u8?$/i, "").trim() || fallback;
}

function playlistFilename(name: string): string {
  const safe = name
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${safe || "playlist"}.m3u`;
}

function MusicPlaylistRenameDialog({
  playlist,
  onClose,
  onRenamed,
}: {
  playlist: MusicPlaylist;
  onClose: () => void;
  onRenamed: (playlist: MusicPlaylist) => void;
}) {
  const t = useT();
  const titleId = useId();
  const [name, setName] = useState(playlist.name);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const { closing, close } = useModalExit(onClose);

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || working) return;
    if (trimmed === playlist.name) {
      close();
      return;
    }
    setWorking(true);
    setError("");
    try {
      onRenamed(await renameMusicPlaylist(playlist.id, trimmed));
      close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setWorking(false);
    }
  };

  return (
    <ModalShell closing={closing} onDismiss={close} width={420} labelledBy={titleId}>
      <form className="flex flex-col gap-4 p-5" onSubmit={(event) => void rename(event)}>
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {t("music.playlist.rename")}
        </h2>
        <input
          autoFocus
          value={name}
          maxLength={100}
          disabled={working}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
          }}
          aria-label={t("music.playlist.nameLabel")}
          className="min-h-11 w-full rounded-md bg-elevated px-3 py-2 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-accent"
        />
        {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="music-library-text" disabled={working} onClick={close}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="music-library-button" disabled={!name.trim() || working}>
            {working ? <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" /> : null}
            {t("common.save")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
