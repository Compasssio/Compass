export type DvrSession = {
  id: string;
  outputPath: string;
  channelName: string;
  programTitle: string | null;
  startedAtMs: number;
  plannedDurationSec: number;
  bytesWritten: number;
  elapsedSec: number;
  state: "recording" | "done" | "error";
  error: string | null;
};

export type DvrStartArgs = {
  url: string;
  outputDir: string;
  filename: string;
  durationSec: number;
  channelName: string;
  programTitle: string | null;
};
