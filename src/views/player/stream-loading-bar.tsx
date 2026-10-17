import { useEffect, useState } from "react";

export function StreamLoadingBar({ ready, done }: { ready: number; done: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    setPct((cur) => (done ? 100 : Math.max(cur, ready)));
  }, [ready, done]);
  const indeterminate = pct < 1 && !done;

  return (
    <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/12">
      {indeterminate ? (
        <div
          className="h-full w-2/5 rounded-full bg-white/75"
          style={{ animation: "stremio-progress 1.4s ease-in-out infinite" }}
        />
      ) : (
        <div
          className="compass-barberpole h-full rounded-full bg-white"
          style={{ width: `${pct}%`, transition: `width ${done ? 350 : 1900}ms linear` }}
        />
      )}
    </div>
  );
}
