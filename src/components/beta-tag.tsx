import { IS_BETA_BUILD } from "@/lib/build-info";
import { useT } from "@/lib/i18n";

export function BetaTag({ force = false }: { force?: boolean }) {
  const t = useT();
  if (!force && !IS_BETA_BUILD) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent ring-1 ring-accent/30">
      {t("Beta")}
    </span>
  );
}
