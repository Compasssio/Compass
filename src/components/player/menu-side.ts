import { useCallback, useState, type RefObject } from "react";

export function useMenuSide(ref: RefObject<HTMLElement | null>, width: number) {
  const [side, setSide] = useState<"start" | "end">("end");
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - 32);
    setSide(r.right - w < 16 ? "start" : "end");
  }, [ref, width]);
  return { side, measure };
}
