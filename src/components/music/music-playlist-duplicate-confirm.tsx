import { LoaderCircle } from "@/components/icons/music-icons";
import { useT } from "@/lib/i18n";

export function MusicPlaylistDuplicateConfirm({
  title,
  playlistName,
  busy = false,
  onCancel,
  onContinue,
}: {
  title: string;
  playlistName: string;
  busy?: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const t = useT();

  return (
    <div className="rounded-md border border-edge-soft bg-elevated/50 p-3">
      <p role="alert" className="text-[13px] leading-5 text-ink-muted">
        {t("music.playlist.duplicateWarning", { title, name: playlistName })}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="min-h-10 rounded-md px-3 text-[13px] text-ink-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={onContinue}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-3 text-[13px] font-medium text-canvas disabled:opacity-50"
        >
          {busy && <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />}
          {t("music.playlist.addDuplicate")}
        </button>
      </div>
    </div>
  );
}
