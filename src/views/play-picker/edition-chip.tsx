import type { ScoredStream } from "@/lib/streams/types";

function editionText(edition: string): string {
  if (/director/i.test(edition)) return "Director's Cut";
  if (/open[\s.]?matte/i.test(edition)) return "Open Matte";
  return edition;
}

export function EditionChip({ stream }: { stream: ScoredStream }) {
  if (!stream.edition) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-accent ring-1 ring-accent/30">
      {editionText(stream.edition)}
    </span>
  );
}
