/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __IS_BETA_BUILD__: boolean;
declare const __BUILD_ID__: string;
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_COMPASS_API_BASE?: string;
  readonly VITE_COMPASS_BUGS_BASE?: string;
  readonly VITE_COMPASS_SYNC_BASE?: string;
  readonly VITE_COMPASS_RELAY_BASE?: string;
  readonly VITE_COMPASS_TRAKT_BASE?: string;
  readonly VITE_COMPASS_MAL_BASE?: string;
  readonly VITE_COMPASS_TVDB_BASE?: string;
}

interface Window {
  __compassStremioDeeplink?: boolean;
  __compassInstallerOpen?: boolean;
}
