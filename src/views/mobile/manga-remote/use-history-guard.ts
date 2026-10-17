import { useEffect } from "react";

export function useHistoryBackGuard(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const sentinel = { compassMangaGuard: true };
    let popping = false;
    try {
      window.history.pushState(sentinel, "");
    } catch {
      return;
    }
    const onPop = () => {
      if (popping) return;
      popping = true;
      try {
        window.history.pushState(sentinel, "");
      } catch {}
      popping = false;
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      try {
        const st = window.history.state as { compassMangaGuard?: boolean } | null;
        if (st && st.compassMangaGuard) window.history.back();
      } catch {}
    };
  }, [active]);
}
