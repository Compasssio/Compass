import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2, X } from "@/components/icons/music-icons";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import { useT } from "@/lib/i18n";
import { renameMusicPlaylist } from "@/lib/music/library";
import { clearPlaylistCover, savePlaylistCover } from "@/lib/music/playlist-cover";
import { renameSpotifyPlaylist, setSpotifyPlaylistCover } from "@/lib/music/spotify-library";
import { MusicPlaylistCover } from "./music-playlist-cover";
import { useMusicPlaylistCover } from "./music-playlist-cover-edit";

export type PlaylistEditTarget = {
  id: string;
  name: string;
  artwork: readonly (string | null | undefined)[];
  /** Spotify playlists change through the Spotify API instead of the local cover store. */
  spotify?: boolean;
};

/** Spotify only stores JPEG covers, and only up to 256 KB. */
const SPOTIFY_COVER_BYTES = 256 * 1024;

async function spotifyCoverBase64(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("music.playlist.coverType");
  }
  try {
    let edge = 640;
    let quality = 0.9;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("music.playlist.coverFailed");
      // JPEG has no alpha; a white plate keeps transparent artwork readable.
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", quality);
      const encoded = url.slice(url.indexOf(",") + 1);
      if (Math.ceil((encoded.length * 3) / 4) <= SPOTIFY_COVER_BYTES - 2048) return encoded;
      if (quality > 0.6) quality -= 0.15;
      else edge = Math.round(edge * 0.75);
    }
    throw new Error("music.playlist.coverSize");
  } finally {
    bitmap.close();
  }
}

export function MusicPlaylistEditDialog({
  target,
  onClose,
  onSaved,
}: {
  target: PlaylistEditTarget;
  onClose: () => void;
  /** Called with the saved name; the caller updates its list and lets onClose unmount. */
  onSaved: (name: string) => void;
}) {
  const t = useT();
  const { closing, close } = useModalExit(onClose);
  const titleId = useId();
  const storedCover = useMusicPlaylistCover(target.spotify ? "" : target.id);
  const [name, setName] = useState(target.name);
  const [file, setFile] = useState<File | null>(null);
  const [cleared, setCleared] = useState(false);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const custom = preview || (storedCover && !cleared ? storedCover : "");
  const trimmed = name.trim();
  const changed =
    trimmed !== target.name || Boolean(file) || (cleared && Boolean(storedCover));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !trimmed) return;
    setBusy(true);
    setError("");
    try {
      if (target.spotify) {
        if (trimmed !== target.name) await renameSpotifyPlaylist(target.id, trimmed);
        if (file) await setSpotifyPlaylistCover(target.id, await spotifyCoverBase64(file));
      } else {
        if (trimmed !== target.name) await renameMusicPlaylist(target.id, trimmed);
        if (file) await savePlaylistCover(target.id, file);
        else if (cleared) await clearPlaylistCover(target.id);
      }
      onSaved(trimmed);
      close();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message.startsWith("music.") ? t(message) : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell closing={closing} onDismiss={close} width={560} labelledBy={titleId}>
      <form className="flex flex-col gap-5 p-6" onSubmit={(event) => void save(event)}>
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold text-ink">
            {t("music.playlist.editDetails")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("common.close")}
            className="grid size-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors duration-150 ease-out hover:bg-elevated hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-6">
          <div className="flex w-40 shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              aria-label={t("music.playlist.coverUpload")}
              className="group relative block w-full overflow-hidden rounded-md bg-elevated disabled:opacity-60"
            >
              {custom ? (
                <img
                  src={custom}
                  alt=""
                  draggable={false}
                  className="block aspect-square w-full object-cover"
                />
              ) : (
                <MusicPlaylistCover
                  artwork={target.artwork}
                  seed={target.id}
                  glyphSize={36}
                  className="rounded-md"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Plus size={22} />
              </span>
            </button>
            {!target.spotify && (preview || (storedCover && !cleared)) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  setCleared(true);
                  setError("");
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
              >
                <Trash2 size={14} aria-hidden="true" />
                {t("music.playlist.coverRemove")}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor={`${titleId}-name`} className="text-[12px] text-ink-muted">
              {t("music.playlist.nameLabel")}
            </label>
            <input
              id={`${titleId}-name`}
              value={name}
              maxLength={100}
              disabled={busy}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 w-full rounded-md bg-elevated px-3 py-2 text-[15px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !trimmed || !changed}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 text-[13px] font-semibold text-canvas transition-transform duration-150 ease-out hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />}
            {t("music.playlist.save")}
          </button>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          hidden
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = "";
            if (!picked) return;
            setFile(picked);
            setCleared(false);
            setError("");
          }}
        />
      </form>
    </ModalShell>
  );
}
