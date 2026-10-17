import { useLayoutEffect, useRef, type RefObject, type UIEvent } from "react";

/**
 * Keep a list's scroll position while its contents update in place.
 *
 * The scroll top is recorded as the user scrolls and restored after a commit. If
 * a commit shrinks the content the browser clamps scrollTop to 0, so a recorded
 * value is only re-applied when the container was reset to the top.
 */
export function useScrollPreserved(ref: RefObject<HTMLElement | null>) {
  const top = useRef(0);
  const onScroll = (event: UIEvent<HTMLElement>) => {
    top.current = event.currentTarget.scrollTop;
  };
  useLayoutEffect(() => {
    const node = ref.current;
    if (node && top.current > 0 && node.scrollTop === 0) node.scrollTop = top.current;
  });
  return { onScroll };
}
