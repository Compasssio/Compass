import { createMediaListStore } from "./media-list-store";

const store = createMediaListStore("compass.localwatchlist.v1.");

export const LocalWatchlistProvider = store.Provider;
export const useLocalWatchlist = store.useStore;
export const useInLocalWatchlist = store.useIn;
export const removeLocalWatchlistData = store.removeData;
