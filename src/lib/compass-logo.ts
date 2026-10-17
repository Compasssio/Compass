import { useSettings } from "@/lib/settings";
import { getThemeById } from "@/lib/theme";

export function useCompassLogo(): { mark: string | null; wordmark: string | null } {
  const { settings } = useSettings();
  const preset = settings.theme.preset !== "custom" ? getThemeById(settings.theme.preset) : null;
  return {
    mark: settings.customLogoMark || preset?.logo?.mark || null,
    wordmark: settings.customLogoWordmark || preset?.logo?.wordmark || null,
  };
}
