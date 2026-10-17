import type { RoomCommand } from "./protocol";

export const SEEK_COALESCE_MS = 250;

export type SeekCoalescer = {
  push: (positionSeconds: number) => void;
  flush: () => void;
  dispose: () => void;
};

export function createSeekCoalescer(
  send: (positionSeconds: number, seq: number, at: number) => void,
  intervalMs = SEEK_COALESCE_MS,
): SeekCoalescer {
  let seq = Date.now();
  let timer: number | null = null;
  let pending: number | null = null;
  let lastSentAt = 0;

  const fire = (pos: number) => {
    seq += 1;
    lastSentAt = Date.now();
    send(pos, seq, lastSentAt);
  };

  const onTimer = () => {
    timer = null;
    if (pending == null) return;
    const pos = pending;
    pending = null;
    fire(pos);
    timer = window.setTimeout(onTimer, intervalMs);
  };

  return {
    push(pos: number) {
      const now = Date.now();
      if (timer == null && now - lastSentAt >= intervalMs) {
        fire(pos);
        timer = window.setTimeout(onTimer, intervalMs);
        return;
      }
      pending = pos;
      if (timer == null) {
        timer = window.setTimeout(onTimer, Math.max(0, intervalMs - (now - lastSentAt)));
      }
    },
    flush() {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (pending == null) return;
      const pos = pending;
      pending = null;
      fire(pos);
    },
    dispose() {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      pending = null;
    },
  };
}

export type RoomCommandSender = {
  send: (command: RoomCommand) => void;
  dispose: () => void;
};

export function createCommandSender(raw: (command: RoomCommand) => void): RoomCommandSender {
  const coalescer = createSeekCoalescer((positionSeconds, seq, at) =>
    raw({ action: "seek", positionSeconds, seq, at }),
  );
  return {
    send(command: RoomCommand) {
      if (command.action === "seek") {
        coalescer.push(command.positionSeconds);
        return;
      }
      coalescer.flush();
      raw(command);
    },
    dispose: coalescer.dispose,
  };
}
