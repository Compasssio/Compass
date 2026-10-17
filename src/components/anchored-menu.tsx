import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const GAP = 6;
const EDGE = 8;
const MIN_HEIGHT = 120;

export function AnchoredMenu({
  anchorRef,
  open,
  onClose,
  width,
  fitContent = false,
  position,
  backdrop = true,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  width?: number;
  fitContent?: boolean;
  position?: { x: number; y: number } | null;
  backdrop?: boolean;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    up: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = position
        ? { left: position.x, top: position.y, right: position.x, bottom: position.y, width: 0 }
        : anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const maxWidth = Math.max(0, window.innerWidth - EDGE * 2);
      // offsetWidth: layout width, so the opening scale animation cannot shrink it.
      const naturalWidth = menuRef.current?.offsetWidth ?? 0;
      const w = Math.min(
        maxWidth,
        fitContent ? Math.max(naturalWidth, width ?? 0) : Math.max(r.width, width ?? 0),
      );
      const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - w - EDGE));
      const menuH = menuRef.current?.offsetHeight ?? 0;
      if (position) {
        const maxHeight = Math.max(0, window.innerHeight - EDGE * 2);
        const top = Math.max(
          EDGE,
          Math.min(position.y, window.innerHeight - Math.min(menuH, maxHeight) - EDGE),
        );
        setPos({ top, left, width: w, maxHeight, up: false });
        return;
      }
      const above = r.top - GAP - EDGE;
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const up = menuH > below && above > below;
      const maxHeight = Math.max(MIN_HEIGHT, up ? above : below);
      const top = up ? Math.max(EDGE, r.top - GAP - Math.min(menuH, maxHeight)) : r.bottom + GAP;
      setPos({ top, left, width: w, maxHeight, up });
    };
    place();
    let raf: number | null = requestAnimationFrame(() => {
      raf = null;
      place();
    });
    // A content-width menu must follow its own content: labels that arrive
    // later, or a scrollbar, would otherwise leave the longest item clipped.
    const follow = () => {
      if (!fitContent || raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        place();
      });
    };
    const observer = fitContent && menuRef.current ? new ResizeObserver(follow) : null;
    if (observer) observer.observe(menuRef.current!);
    const onScroll = () => {
      if (position) {
        onClose();
        return;
      }
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        place();
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) onClose();
    };
    if (!backdrop) document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, anchorRef, width, fitContent, position?.x, position?.y, onClose, backdrop]);

  if (!open) return null;

  return createPortal(
    <>
      {backdrop && <div className="fixed inset-0 z-[300]" onMouseDown={onClose} />}
      <div
        ref={menuRef}
        data-anchored-up={pos?.up || undefined}
        className={`fixed z-[310] flex flex-col ${fitContent ? "overflow-y-auto" : ""}`}
        style={{
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          width: fitContent ? "max-content" : pos?.width,
          maxWidth: fitContent ? `calc(100vw - ${EDGE * 2}px)` : undefined,
          maxHeight: pos?.maxHeight,
          visibility: pos ? undefined : "hidden",
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
