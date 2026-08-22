import { computed, ComputedRef } from "vue";
import { api } from "@/plugins/api";
import { store } from "@/plugins/store";
// The critical-reception filter vocabulary (DrBucket / REVIEW_*_KEYS /
// ReviewFilterParams) lives with the feature in @/helpers/criticalReception;
// this module only needs its param slice as a type, which is erased at build.
import type { ReviewFilterParams } from "@/helpers/criticalReception";

/**
 * The preferences key an ItemsListing stores its per-listing settings under.
 * Single source of the `itemsListing.<path>.<itemtype>` namespace so a rename
 * cannot leave a reader and a writer disagreeing.
 */
export const itemsListingPreferenceKey = (path: string, itemtype: string) =>
  `itemsListing.${path}.${itemtype}`;

export interface ItemsListingPreferences extends ReviewFilterParams {
  viewMode?: string;
  sortBy?: string;
  favoriteFilter?: boolean;
  libraryFilter?: boolean;
  albumArtistsFilter?: boolean;
  hideEmptyFilter?: boolean | null;
  hideFullyPlayedFilter?: boolean;
  albumType?: string[];
  providerFilter?: string[];
  // "criticalReceptionMatch" ("any" makes the DR/AMG/TPS clauses combine with OR
  // instead of AND) and the DR/AMG/TPS filter keys come from ReviewFilterParams.
  // Stored per-listing so a saved "find anything acclaimed" view sticks across reloads.
  expand?: boolean;
  search?: string;
  collapseCollections?: boolean;
  activeTab?: string;
}

/**
 * Standalone helper — usable outside Vue component setup (e.g. composables).
 * Sets a single user preference key, deep-clones the value, and persists to the server.
 */
export async function setUserPreference(
  key: string,
  value: unknown,
): Promise<void> {
  await setUserPreferences({ [key]: value });
}

/**
 * Standalone helper — set several preference keys in a single round-trip.
 *
 * Every write PUTs the entire preferences blob, which grows with each listing
 * the user has ever touched, so callers changing more than one key at a time
 * should batch them here rather than issuing sequential single-key writes.
 */
export async function setUserPreferences(
  entries: Record<string, unknown>,
): Promise<void> {
  if (!store.currentUser) {
    console.warn("Cannot set preference: no user logged in");
    return;
  }

  if (!store.currentUser.preferences) {
    store.currentUser.preferences = {};
  }

  const plainEntries = JSON.parse(JSON.stringify(entries));

  const updatedPreferences = {
    ...store.currentUser.preferences,
    ...plainEntries,
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
    const storKey = itemsListingPreferenceKey(path, itemtype);
    return computed(() => {
      if (!store.currentUser?.preferences) {
        return {};
      }
      const value = store.currentUser.preferences[storKey];
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
    await setUserPreferences(
      itemsListingPreferenceEntry(path, itemtype, key, value),
    );
  }

  /**
   * Build the single preferences entry an ItemsListing write produces, without
   * persisting it — so a caller updating a listing preference *and* another key
   * can batch both into one setPreferences call.
   */
  function itemsListingPreferenceEntry(
    path: string,
    itemtype: string,
    key: keyof ItemsListingPreferences,
    value: ItemsListingPreferences[keyof ItemsListingPreferences],
  ): Record<string, unknown> {
    const prefKey = itemsListingPreferenceKey(path, itemtype);
    const currentPrefs = getItemsListingPreferences(path, itemtype);
    return { [prefKey]: { ...currentPrefs.value, [key]: value } };
  }

  return {
    currentUser,
    getPreference,
    setPreference,
    setPreferences: setUserPreferences,
    getItemsListingPreferences,
    setItemsListingPreference,
    itemsListingPreferenceEntry,
  };
}

/**
 * Drop ids from every itemsListing.*.providerFilter and
 * discover.hiddenProviders.* for providers that no longer have a config.
 * Writes once if anything changed.
 *
 * Keyed off configs rather than loaded instances (api.providers): a disabled,
 * failing, or still-starting provider keeps its config and so keeps its filter.
 * Only a removed provider has no config.
 */
export async function pruneStaleProviderFilters(): Promise<void> {
  if (!store.currentUser?.preferences) return;

  let configuredIds: Set<string>;
  try {
    const configs = await api.getProviderConfigs();
    configuredIds = new Set(configs.map((config) => config.instance_id));
  } catch (error) {
    console.error("Failed to load provider configs for filter pruning:", error);
    return;
  }
  // No configs yet (server not ready): never wipe filters.
  if (configuredIds.size === 0) return;

  const prefs = store.currentUser.preferences;
  const updatedPrefs: Record<string, unknown> = { ...prefs };
  let changed = false;

  for (const key of Object.keys(prefs)) {
    if (key.startsWith("itemsListing.")) {
      const value = prefs[key] as ItemsListingPreferences | undefined;
      if (!value || !Array.isArray(value.providerFilter)) continue;
      const pruned = value.providerFilter.filter((id) => configuredIds.has(id));
      if (pruned.length === value.providerFilter.length) continue;
      changed = true;
      const next: ItemsListingPreferences = { ...value };
      if (pruned.length === 0) {
        delete next.providerFilter;
      } else {
        next.providerFilter = pruned;
      }
      updatedPrefs[key] = next;
    } else if (key.startsWith("discover.hiddenProviders.")) {
      // matches rowHiddenProvidersKey's prefix in components/discover/utils/rowProviderFilter.ts
      const value = prefs[key];
      if (!Array.isArray(value)) continue;
      const pruned = (value as string[]).filter((id) => configuredIds.has(id));
      if (pruned.length === value.length) continue;
      changed = true;
      if (pruned.length === 0) {
        delete updatedPrefs[key];
      } else {
        updatedPrefs[key] = pruned;
      }
    }
  }

  if (!changed) return;

  store.currentUser.preferences = updatedPrefs;
  try {
    await api.updateUser(store.currentUser.user_id, {
      preferences: updatedPrefs,
    });
  } catch (error) {
    console.error("Failed to prune stale provider filters:", error);
  }
}
