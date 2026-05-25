import { computed, ComputedRef } from "vue";
import { api } from "@/plugins/api";
import { store } from "@/plugins/store";

// Critical-reception filter shapes shared with ItemsListing.vue.
// `dr_buckets` values match DRQuality from `@/helpers/album_tags` plus "untagged".
// `*_ratings` are integer bucket selectors (AMG: 1..5; TPS: 1,3,5,7,9 covering bands of 2).
// `*_labels` are normalized label kinds: "aoty" | "aotm" | "record_of_the_month" | "honorable_mention".
export type DrBucket = "excellent" | "good" | "fair" | "poor" | "untagged";

export interface ItemsListingPreferences {
  viewMode?: string;
  sortBy?: string;
  favoriteFilter?: boolean;
  libraryFilter?: boolean;
  albumArtistsFilter?: boolean;
  hideEmptyFilter?: boolean | null;
  hideFullyPlayedFilter?: boolean;
  albumType?: string[];
  providerFilter?: string[];
  drBuckets?: DrBucket[];
  amgRatings?: number[];
  amgFavorite?: boolean;
  amgLabels?: string[];
  amgUntagged?: boolean;
  tpsRatings?: number[];
  tpsFavorite?: boolean;
  tpsLabels?: string[];
  tpsUntagged?: boolean;
  // "any" makes the DR/AMG/TPS clauses combine with OR instead of AND. Stored
  // per-listing so a saved "find anything acclaimed" view sticks across reloads.
  criticalReceptionMatch?: "all" | "any";
  expand?: boolean;
  search?: string;
}

/**
 * Standalone helper — usable outside Vue component setup (e.g. composables).
 * Sets a single user preference key, deep-clones the value, and persists to the server.
 */
export async function setUserPreference(
  key: string,
  value: unknown,
): Promise<void> {
  if (!store.currentUser) {
    console.warn("Cannot set preference: no user logged in");
    return;
  }

  if (!store.currentUser.preferences) {
    store.currentUser.preferences = {};
  }

  const plainValue = JSON.parse(JSON.stringify(value));

  const updatedPreferences = {
    ...store.currentUser.preferences,
    [key]: plainValue,
  };

  store.currentUser.preferences = updatedPreferences;

  try {
    await api.updateUser(store.currentUser.user_id, {
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error("Failed to update user preferences:", error);
  }
}

/**
 * Composable for managing user preferences stored on the server
 */
export function useUserPreferences() {
  const currentUser = computed(() => store.currentUser);

  /**
   * Get a preference value from user preferences as a computed ref
   */
  function getPreference<T>(key: string, defaultValue: T): ComputedRef<T>;
  function getPreference<T>(key: string): ComputedRef<T | undefined>;
  function getPreference<T>(
    key: string,
    defaultValue?: T,
  ): ComputedRef<T | undefined> {
    return computed(() => {
      if (!store.currentUser?.preferences) {
        return defaultValue;
      }
      const value = store.currentUser.preferences[key] as T | undefined;
      return value !== undefined ? value : defaultValue;
    });
  }

  /**
   * Set a preference value in user preferences
   * Updates optimistically on the client and sends to server
   */
  async function setPreference(key: string, value: unknown): Promise<void> {
    await setUserPreference(key, value);
  }

  /**
   * Get ItemsListing preferences for a specific path/itemtype as a computed ref
   */
  function getItemsListingPreferences(
    path: string,
    itemtype: string,
  ): ComputedRef<ItemsListingPreferences> {
    const storKey = `${path}.${itemtype}`;
    return computed(() => {
      if (!store.currentUser?.preferences) {
        return {};
      }
      const value = store.currentUser.preferences[`itemsListing.${storKey}`];
      return (value as ItemsListingPreferences) || {};
    });
  }

  /**
   * Set ItemsListing preferences for a specific path/itemtype
   */
  async function setItemsListingPreference(
    path: string,
    itemtype: string,
    key: keyof ItemsListingPreferences,
    value: ItemsListingPreferences[keyof ItemsListingPreferences],
  ): Promise<void> {
    const storKey = `${path}.${itemtype}`;
    const prefKey = `itemsListing.${storKey}`;

    const currentPrefs = getItemsListingPreferences(path, itemtype);
    const updatedPrefs = {
      ...currentPrefs.value,
      [key]: value,
    };

    await setPreference(prefKey, updatedPrefs);
  }

  return {
    currentUser,
    getPreference,
    setPreference,
    getItemsListingPreferences,
    setItemsListingPreference,
  };
}
