let videoOwns = false;

/** The video player and Music both listen for compass://media-key, so one has to yield. */
export function setVideoOwnsMediaKeys(owns: boolean): void {
  videoOwns = owns;
}

export function videoOwnsMediaKeys(): boolean {
  return videoOwns;
}
