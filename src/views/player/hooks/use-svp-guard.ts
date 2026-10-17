import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

export function useSvpGuard(enabled: boolean): string | null {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onFailed = () => {
      setToast(t("SVP couldn't start, playing without smoothing"));
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 4500);
    };
    window.addEventListener("compass:svp-failed", onFailed);
    return () => {
      window.removeEventListener("compass:svp-failed", onFailed);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enabled]);

  return toast;
}
