import { isAnyFullscreen, exitAnyFullscreen } from "@/lib/fullscreen-state";
import { getLeaveConfirm, openLeaveConfirm } from "@/lib/player/leave-confirm";

/** Shared Esc/Back leave path for player hotkeys and TV/remote Back. */
export async function requestPlayerClose(opts: {
  drawMode: boolean;
  setDrawMode: (v: boolean) => void;
  closePlayer: () => void | Promise<void>;
  playerEscExitsFullscreen: boolean;
  playerConfirmLeave: boolean;
  onRememberConfirmLeave?: () => void;
}): Promise<void> {
  if (getLeaveConfirm().open) return;
  if (opts.drawMode) {
    opts.setDrawMode(false);
    return;
  }
  if (opts.playerEscExitsFullscreen && (await isAnyFullscreen())) {
    await exitAnyFullscreen();
    return;
  }
  if (opts.playerConfirmLeave) {
    openLeaveConfirm((remember) => {
      if (remember) opts.onRememberConfirmLeave?.();
      void opts.closePlayer();
    });
    return;
  }
  await opts.closePlayer();
}
