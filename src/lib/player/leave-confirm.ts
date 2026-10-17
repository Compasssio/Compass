type LeaveConfirmState = {
  open: boolean;
  onConfirm: ((remember: boolean) => void) | null;
};

let state: LeaveConfirmState = { open: false, onConfirm: null };
const subs = new Set<() => void>();

function emit(): void {
  for (const fn of subs) fn();
}

export function openLeaveConfirm(onConfirm: (remember: boolean) => void): void {
  state = { open: true, onConfirm };
  emit();
}

export function closeLeaveConfirm(): void {
  if (!state.open) return;
  state = { open: false, onConfirm: null };
  emit();
}

export function getLeaveConfirm(): LeaveConfirmState {
  return state;
}

export function subscribeLeaveConfirm(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
