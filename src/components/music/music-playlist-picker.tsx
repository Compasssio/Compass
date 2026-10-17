import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Plus, X } from "@/components/icons/music-icons";
import { MusicActionGlyph } from "./music-action-feedback";
import { MusicPlaylistCover } from "./music-playlist-cover";
import { MusicPlaylistDuplicateConfirm } from "./music-playlist-duplicate-confirm";
import { useScrollPreserved } from "./use-scroll-preserved";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import { useT } from "@/lib/i18n";
import {
  addTrackToMusicPlaylist,
  createMusicPlaylist,
  listMusicPlaylists,
} from "@/lib/music/library";
import type { MusicPlaylist, MusicTrack } from "@/lib/music/types";
import { sameMusicTrack } from "@/lib/music/track-identity";
import { useMusicConnections } from "./music-connections";
import { MusicSpotifyDestination } from "./music-spotify-destination";
import { MusicServiceLogo } from "./music-service-logo";
import { MusicPlaylistSearch, matchesPlaylistSearch } from "./music-playlist-search";

type PickerValue = { openPlaylistPicker: (track: MusicTrack) => void };

const Context = createContext<PickerValue>({ openPlaylistPicker: () => {} });

export function useMusicPlaylistPicker(): PickerValue {
  return useContext(Context);
}

/**
 * Saving a track to a playlist from any list in the app. The track rows already carry an
 * "add to playlist" entry; this is what that entry opens.
 */
export function MusicPlaylistPickerProvider({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const openPlaylistPicker = useCallback((next: MusicTrack) => {
    if (active) setTrack(next);
  }, [active]);
  useEffect(() => {
    if (!active) setTrack(null);
  }, [active]);
  const value = useMemo(() => ({ openPlaylistPicker }), [openPlaylistPicker]);

  return (
    <Context.Provider value={value}>
      {children}
      {active && track && <PickerModal key={`${track.connectorId}:${track.id}`} track={track} onDismiss={() => setTrack(null)} />}
    </Context.Provider>
  );
}

function PickerModal({ track, onDismiss }: { track: MusicTrack; onDismiss: () => void }) {
  const t = useT();
  const { closing, close } = useModalExit(onDismiss);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<MusicPlaylist | null>(null);
  const mounted = useRef(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const titleId = useId();
  const filtered = playlists.filter(playlist => matchesPlaylistSearch(playlist.name, query));
  const [destination, setDestination] = useState<"compass" | "spotify">("compass");
  const { openConnections } = useMusicConnections();
  const listScroll = useScrollPreserved(list);

  useEffect(() => {
    let cancelled = false;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    mounted.current = true;
    listMusicPlaylists()
      .then((next) => {
        if (!cancelled) setPlaylists(next);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      mounted.current = false;
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, []);

  const save = async (playlistId: string, allowDuplicate = false) => {
    if (busy || saved || closing) return;
    const playlist = playlists.find((item) => item.id === playlistId);
    if (
      !allowDuplicate &&
      playlist?.tracks.some((existing) => sameMusicTrack(existing, track))
    ) {
      setDuplicateTarget(playlist);
      return;
    }
    if (!allowDuplicate) setDuplicateTarget(null);
    setBusy(true);
    setTarget(playlistId);
    setError("");
    try {
      await addTrackToMusicPlaylist(playlistId, track);
      if (!mounted.current) return;
      setDuplicateTarget(null);
      setSaved(playlistId);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const createAndSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy || saved || closing || duplicateTarget) return;
    setBusy(true);
    setTarget(null);
    setError("");
    try {
      const playlist = await createMusicPlaylist(trimmed);
      await addTrackToMusicPlaylist(playlist.id, track);
      if (!mounted.current) return;
      setSaved(playlist.id);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <ModalShell closing={closing} onDismiss={close} width={820} labelledBy={titleId}>
      <div ref={root} className="music-playlist-picker" onKeyDown={event => {
        if (event.key !== "Tab") return;
        const targets = [...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')].filter(node => node.getClientRects().length);
        if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0]?.focus(); }
      }}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-subtle">
            {t("music.playlist.add")}
          </p>
          <h2 id={titleId} className="mt-1 truncate text-[18px] text-ink">{track.title}</h2>
        </div><button type="button" onClick={close} className="music-playlist-picker-close" aria-label={t("common.close")}><X size={20} /></button></div>

        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label={t("music.spotifyLibrary.destination")}
        >
          {(["compass", "spotify"] as const).map((value) => (
            <button
              type="button"
              key={value}
              disabled={busy || !!saved || !!duplicateTarget}
              aria-pressed={destination === value}
              onClick={() => setDestination(value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-[13px] ${destination === value ? "bg-ink text-canvas" : "bg-raised text-ink-muted"}`}
            >
              {value === "spotify" && <MusicServiceLogo source="spotify" size={16} />}
              {t(
                value === "compass"
                  ? "music.spotifyLibrary.compass"
                  : "music.spotifyLibrary.playlists",
              )}
            </button>
          ))}
        </div>
        <MusicPlaylistSearch query={query} onChange={setQuery} />
        {destination === "spotify" ? (
          <MusicSpotifyDestination
            track={track}
            query={query}
            onDone={close}
            onSetup={() => {
              close();
              openConnections("spotify");
            }}
          />
        ) : (
          <>
            <span role="status" className="sr-only">{saved ? t("music.similar.saved") : ""}</span>
            {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
            {duplicateTarget && (
              <MusicPlaylistDuplicateConfirm
                title={track.title}
                playlistName={duplicateTarget.name}
                busy={busy}
                onCancel={() => setDuplicateTarget(null)}
                onContinue={() => void save(duplicateTarget.id, true)}
              />
            )}

            {loading ? (
              <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {t("common.loading")}
              </span>
            ) : (
              <ul ref={list} className="music-playlist-destination-list" onScroll={listScroll.onScroll}>
                {filtered.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      disabled={busy || !!saved || !!duplicateTarget}
                      aria-busy={busy && target === playlist.id}
                      data-music-action-state={saved === playlist.id ? "done" : busy && target === playlist.id ? "busy" : "idle"}
                      onClick={() => void save(playlist.id)}
                      className="music-action-button music-playlist-destination-cell"
                    >
                      <MusicPlaylistCover
                        artwork={playlist.tracks.map((entry) => entry.artwork)}
                        seed={playlist.id}
                        glyphSize={20}
                        className="music-playlist-destination-cover"
                      />
                      <span className="music-playlist-destination-copy">
                        <span className="truncate">{playlist.name}</span>
                        <small className="truncate">
                          {t("music.card.trackCount", { count: playlist.tracks.length })}
                        </small>
                      </span>
                      <MusicActionGlyph state={saved === playlist.id ? "done" : busy && target === playlist.id ? "busy" : "idle"} idle={null} size={16} />
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="music-playlist-destination-empty">
                    {t(query.trim() ? "music.playlist.noMatches" : "music.playlist.none")}
                  </li>
                )}
              </ul>
            )}

            <div className="flex items-center gap-2 border-t border-edge pt-4">
              <input
                value={name}
                disabled={busy || !!saved || !!duplicateTarget}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createAndSave();
                }}
                placeholder={t("music.playlist.namePlaceholder")}
                aria-label={t("music.playlist.nameLabel")}
                className="min-w-0 flex-1 rounded-md bg-elevated px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-subtle"
              />
              <button
                type="button"
                disabled={busy || !!saved || !!duplicateTarget || name.trim().length === 0}
                aria-busy={busy && target === null}
                data-music-action-state={saved && target === null ? "done" : busy && target === null ? "busy" : "idle"}
                onClick={() => void createAndSave()}
                className="music-action-button inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-[13px] text-ink transition-colors hover:bg-elevated disabled:opacity-50"
              >
                <MusicActionGlyph state={saved && target === null ? "done" : busy && target === null ? "busy" : "idle"} idle={<Plus size={16} />} size={16} />
                {t(saved && target === null ? "music.similar.saved" : "music.playlist.create")}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
