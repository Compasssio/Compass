export type WatchLocalChoice = "local" | "local-restart" | "stream";

type WatchLocalState = {
  open: boolean;
  title: string;
  subtitle: string | null;
  hasResume: boolean;
  resumeMs: number;
  onChoose: ((choice: WatchLocalChoice, remember: boolean) => void) | null;
};

let state: WatchLocalState = {
  open: false,
  title: "",
  subtitle: null,
  hasResume: false,
  resumeMs: 0,
  onChoose: null,
};
const subs = new Set<() => void>();

function emit(): void {
  for (const fn of subs) fn();
}

export function openWatchLocalConfirm(opts: {
  title: string;
  subtitle?: string | null;
  hasResume?: boolean;
  resumeMs?: number;
  onChoose: (choice: WatchLocalChoice, remember: boolean) => void;
}): void {
  state = {
    open: true,
    title: opts.title,
    subtitle: opts.subtitle ?? null,
    hasResume: opts.hasResume === true,
    resumeMs: opts.resumeMs ?? 0,
    onChoose: opts.onChoose,
  };
  emit();
}

export function closeWatchLocalConfirm(): void {
  if (!state.open) return;
  state = { open: false, title: "", subtitle: null, hasResume: false, resumeMs: 0, onChoose: null };
  emit();
}

export function getWatchLocalConfirm(): WatchLocalState {
  return state;
}

export function subscribeWatchLocalConfirm(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
