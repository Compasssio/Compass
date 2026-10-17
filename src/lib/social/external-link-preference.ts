export const EXTERNAL_LINK_PREFERENCE_KEY = "compass.external-link-destination.v1";

export type ExternalLinkDestinationPreference = "browser" | "compass";
export type ExternalLinkPreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): ExternalLinkPreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readExternalLinkDestinationPreference(
  storage: ExternalLinkPreferenceStorage | null = browserStorage(),
): ExternalLinkDestinationPreference {
  if (!storage) return "browser";
  try {
    return storage.getItem(EXTERNAL_LINK_PREFERENCE_KEY) === "compass" ? "compass" : "browser";
  } catch {
    return "browser";
  }
}

export function writeExternalLinkDestinationPreference(
  preference: ExternalLinkDestinationPreference,
  storage: ExternalLinkPreferenceStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(EXTERNAL_LINK_PREFERENCE_KEY, preference);
  } catch {
    // Opening the link remains available when persistence is unavailable.
  }
}

export function resolveExternalLinkActionLayout(
  preference: ExternalLinkDestinationPreference,
  canOpenInCompass: boolean,
): {
  main: ExternalLinkDestinationPreference;
  alternate: ExternalLinkDestinationPreference | null;
} {
  if (!canOpenInCompass) return { main: "browser", alternate: null };
  return preference === "compass"
    ? { main: "compass", alternate: "browser" }
    : { main: "browser", alternate: "compass" };
}
