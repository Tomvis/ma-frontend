import type { LoadDataParams } from "@/components/ItemsListing.vue";
import type { CriticalReceptionFilter } from "@/plugins/api/interfaces";
import {
  REVIEW_BOOL_KEYS,
  REVIEW_LIST_KEYS,
  type ReviewBoolKey,
  type ReviewFilterParams,
  type ReviewListKey,
} from "@/composables/userPreferences";

/**
 * Preference key -> wire key for every review filter.
 *
 * Typed against CriticalReceptionFilter so a renamed wire field fails the build
 * here, and keyed by the shared REVIEW_*_KEYS unions so a new filter key is a
 * compile error until it is mapped — keeping "adding a key is one edit" true.
 */
const REVIEW_FILTER_WIRE_KEY: Record<
  ReviewListKey | ReviewBoolKey,
  keyof CriticalReceptionFilter
> = {
  drBuckets: "dr_buckets",
  amgRatings: "amg_ratings",
  amgAccolades: "amg_accolades",
  tpsRatings: "tps_ratings",
  tpsAccolades: "tps_accolades",
  amgFavorite: "amg_favorite",
  amgUntagged: "amg_untagged",
  tpsFavorite: "tps_favorite",
  tpsUntagged: "tps_untagged",
};

/**
 * The full set of album sort keys offered by the library Albums view. Shared so
 * the Listen Later view (which prepends its own listen-later keys) stays in
 * lockstep — adding an album sort key here surfaces it in both views. Order is
 * significant: sortKeys[0] is the default sort.
 */
export const ALBUM_SORT_KEYS = [
  "name",
  "name_desc",
  "sort_name",
  "sort_name_desc",
  "year",
  "year_desc",
  "timestamp_added",
  "timestamp_added_desc",
  "last_played",
  "last_played_desc",
  "play_count",
  "play_count_desc",
  "artist_name",
  "artist_name_desc",
  "dr",
  "dr_desc",
  "amg_rating",
  "amg_rating_desc",
  "tps_rating",
  "tps_rating_desc",
] as const;

/**
 * Build a CriticalReceptionFilter from the DR / AMG / TPS list-filter params.
 *
 * Returns undefined when no critical-reception filter is active. Shared by the
 * Albums and Listen Later library views so they always build identical server
 * queries (count and list track 1-1).
 */
export function buildCriticalReceptionFilter(
  params: ReviewFilterParams,
): CriticalReceptionFilter | undefined {
  const f: CriticalReceptionFilter = {};
  for (const key of REVIEW_LIST_KEYS) {
    const value = params[key];
    if (value?.length) {
      // each list key maps 1-1 onto its snake_case wire key, checked by the
      // REVIEW_FILTER_WIRE_KEY type annotation above
      (f as Record<string, unknown>)[REVIEW_FILTER_WIRE_KEY[key]] = value;
    }
  }
  for (const key of REVIEW_BOOL_KEYS) {
    if (params[key]) {
      (f as Record<string, unknown>)[REVIEW_FILTER_WIRE_KEY[key]] = true;
    }
  }
  if (Object.keys(f).length === 0) return undefined;
  // Only emit match mode when ANY is selected; the server defaults to ALL.
  if (params.criticalReceptionMatch === "any") {
    f.critical_reception_match = "any";
  }
  return f;
}

/**
 * Marshal the filter half of a listing's params into getLibraryAlbums options.
 *
 * Paging and ordering stay with the caller (they differ per view and per call);
 * everything that selects *which* albums match lives here so the Albums and
 * Listen Later views cannot drift into asking the server two different
 * questions. Accepts a partial so callers holding a snapshot of the last params
 * can pass it straight through.
 */
export function albumFiltersFromParams(params: Partial<LoadDataParams>) {
  return {
    favorite: params.favoritesOnly || undefined,
    search: params.search,
    album_types: params.albumType,
    provider: params.provider?.length ? params.provider : undefined,
    genre: params.genreIds,
    critical_reception_filter: buildCriticalReceptionFilter(params),
  };
}
