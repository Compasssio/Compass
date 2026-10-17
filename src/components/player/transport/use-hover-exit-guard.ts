import { useEffect, type RefObject } from "react";

// WebKitGTK can drop the pointerleave for a thin strip when the pointer exits
// it quickly, which leaves the hover preview (thumbnail or time label) pinned
// on screen until the bar is entered and left again. Comparing the pointer
// against the strip on every move clears hover as soon as the pointer is
// demonstrably elsewhere, with or without the leave event, and leaving the
// window clears it through the document mouseout that the player chrome
// already relies on. A press that starts a scrub drag is exempt while it is
// active so dragging past the bar keeps the scrub readout.
export function useHoverExitGuard(
  barRef: RefObject<HTMLElement | null>,
  activeRef: RefObject<boolean>,
  onExit: () => void,
): void {
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!activeRef.current || event.pointerType === "touch") return;
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) onExit();
    };
    const onMouseOut = (event: MouseEvent) => {
      if (activeRef.current && !event.relatedTarget) onExit();
    };
    window.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("mouseout", onMouseOut, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("mouseout", onMouseOut, true);
    };
  }, [activeRef, barRef, onExit]);
}
