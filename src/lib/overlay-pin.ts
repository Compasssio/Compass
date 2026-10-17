import { useEffect, useState } from "react";

let count = 0;
const subs = new Set<(open: boolean) => void>();

function notify() {
  const open = count > 0;
  for (const cb of subs) cb(open);
}

export function pushOverlayPin(): () => void {
  count += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count = Math.max(0, count - 1);
    notify();
  };
}

export function useOverlayPinned(): boolean {
  const [open, setOpen] = useState(count > 0);
  useEffect(() => {
    subs.add(setOpen);
    setOpen(count > 0);
    return () => {
      subs.delete(setOpen);
    };
  }, []);
  return open;
}
