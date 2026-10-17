export type DubSub = "dub" | "sub" | "dual";

const JA = ["japanese", "jpn", "jp", "ja"];
const EN = ["english", "eng", "en"];

export function streamDubSub(languages: string[] | undefined, isAnime: boolean): DubSub | null {
  if (!isAnime || !languages || languages.length === 0) return null;
  const langs = languages.map((l) => l.toLowerCase());
  const has = (set: string[]) => langs.some((l) => set.some((s) => l === s || l.includes(s)));
  const hasEn = has(EN);
  const hasJa = has(JA);
  if (hasEn && hasJa) return "dual";
  if (hasEn) return "dub";
  if (hasJa) return "sub";
  return null;
}

const STYLE: Record<DubSub, string> = {
  sub: "bg-canvas/70 text-ink-subtle ring-1 ring-edge-soft",
  dub: "bg-accent/15 text-accent ring-1 ring-accent/35",
  dual: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
};

const LABEL: Record<DubSub, string> = { sub: "SUB", dub: "DUB", dual: "DUAL" };

export function DubSubPill({ kind, size = "sm" }: { kind: DubSub; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-bold uppercase tracking-[0.08em] ${STYLE[kind]} ${
        size === "md" ? "px-1.5 py-0.5 text-[10px]" : "px-1 py-px text-[9px]"
      }`}
    >
      {LABEL[kind]}
    </span>
  );
}
