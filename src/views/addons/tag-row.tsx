import type { ResolvedAddon } from "@/lib/addons-store/store";
import { useT } from "@/lib/i18n";

export function TagRow({ resolved }: { resolved: ResolvedAddon }) {
  const t = useT();
  const tags = resolved.curated?.tags ?? [];
  const chips: { label: string; tone: "neutral" | "warn" | "good" }[] = [];
  for (const tag of tags) {
    if (tag === "official") chips.push({ label: t("Official"), tone: "good" });
    if (tag === "free") chips.push({ label: t("Free"), tone: "neutral" });
    if (tag === "premium") chips.push({ label: t("Paid"), tone: "warn" });
    if (tag === "debrid-required") chips.push({ label: t("Debrid required"), tone: "warn" });
    if (tag === "configurable") chips.push({ label: t("Configurable"), tone: "neutral" });
    if (tag === "usenet") chips.push({ label: t("Usenet"), tone: "neutral" });
  }
  if (resolved.manifest?.behaviorHints?.adult) chips.push({ label: t("Adult"), tone: "warn" });
  if (chips.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${
            c.tone === "good"
              ? "bg-accent/15 text-accent"
              : c.tone === "warn"
                ? "bg-edge text-ink-muted"
                : "bg-edge text-ink-subtle"
          }`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
