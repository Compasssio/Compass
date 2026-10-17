/** Hidden Back/Escape target for TV focus scopes. Not focusable itself. */
export function TvModalClose({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      data-tv-modal-close
      tabIndex={-1}
      className="hidden"
      aria-label={label}
      onClick={onClose}
    />
  );
}
