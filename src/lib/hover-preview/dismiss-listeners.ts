export type DismissHooks = {
  insidePanel: (target: EventTarget | null) => boolean;
  cancel: () => void;
  escape: () => boolean;
  hidden: () => boolean;
};

export function createDismissListeners(hooks: DismissHooks): (want: boolean) => void {
  let listening = false;

  const onPointer = (e: Event) => {
    if (hooks.insidePanel(e.target)) return;
    hooks.cancel();
  };

  const onAny = () => hooks.cancel();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (hooks.escape()) e.stopPropagation();
  };

  const onVisibility = () => {
    if (hooks.hidden()) hooks.cancel();
  };

  return (want: boolean) => {
    if (want === listening) return;
    listening = want;
    if (want) {
      document.addEventListener("pointerdown", onPointer, true);
      document.addEventListener("click", onPointer, true);
      document.addEventListener("wheel", onAny, { capture: true, passive: true });
      document.addEventListener("scroll", onAny, true);
      document.addEventListener("contextmenu", onPointer, true);
      window.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onAny);
      window.addEventListener("resize", onAny);
    } else {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("click", onPointer, true);
      document.removeEventListener("wheel", onAny, { capture: true } as EventListenerOptions);
      document.removeEventListener("scroll", onAny, true);
      document.removeEventListener("contextmenu", onPointer, true);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onAny);
      window.removeEventListener("resize", onAny);
    }
  };
}
