import type { CriticalReceptionFilter } from "@/plugins/api/interfaces";

// Critical-reception filter shapes shared with ItemsListing.vue.
// `dr_buckets` values match DRQuality from `@/helpers/album_tags` plus "untagged".
// `*_ratings` are integer bucket selectors (AMG: 1..5; TPS: 1,3,5,7,9 covering bands of 2).
// `*_accolades` are normalized accolade kinds matched against the merged accolades[]:
// "aoty" | "record_of_the_month" | "honorable_mention" | "score_revised" | "tymhm" | "sitf" | "ymio" | "lit" | "rfu".
export type DrBucket = "excellent" | "good" | "fair" | "poor" | "untagged";

// Single source of truth for the review-filter (DR / AMG / TPS) preference keys.
// Both ItemsListing.vue (param mutators, clear-all, restore) and ReviewFiltersPanel.vue
// derive their key unions and param slice from these so adding a key is one edit.
export const REVIEW_LIST_KEYS = [
  "drBuckets",
  "amgRatings",
  "amgAccolades",
  "tpsRatings",
  "tpsAccolades",
] as const;
export const REVIEW_BOOL_KEYS = [
  "amgFavorite",
  "amgUntagged",
  "tpsFavorite",
  "tpsUntagged",
] as const;
export type ReviewListKey = (typeof REVIEW_LIST_KEYS)[number];
export type ReviewBoolKey = (typeof REVIEW_BOOL_KEYS)[number];

/**
 * Every per-listing preference key the review filters own, including the
 * cross-clause match mode. Used by clear-all to walk the whole group in one
 * pass instead of re-listing the keys inline.
 */
export const REVIEW_ALL_KEYS = [
  ...REVIEW_LIST_KEYS,
  ...REVIEW_BOOL_KEYS,
  "criticalReceptionMatch",
] as const;

/**
 * Filter key -> the source (DR / AMG / TPS) whose toggle prop gates it.
 *
 * Keyed by the shared REVIEW_*_KEYS unions so a new filter key is a compile
 * error until it is attributed — replacing the old key-name prefix sniff, which
 * silently attributed anything not starting with "dr"/"amg" to TPS.
 */
export const REVIEW_KEY_SOURCE: Record<
  ReviewListKey | ReviewBoolKey,
  "dr" | "amg" | "tps"
> = {
  drBuckets: "dr",
  amgRatings: "amg",
  amgAccolades: "amg",
  amgFavorite: "amg",
  amgUntagged: "amg",
  tpsRatings: "tps",
  tpsAccolades: "tps",
  tpsFavorite: "tps",
  tpsUntagged: "tps",
};

// The critical-reception slice of a listing's params/prefs. The canonical shape
// for DR/AMG/TPS filters; LoadDataParams and ReviewFiltersPanel both Pick from
// (or mirror) this so the three stay in lockstep.
export interface ReviewFilterParams {
  drBuckets?: DrBucket[];
  amgRatings?: number[];
  amgFavorite?: boolean;
  amgAccolades?: string[];
  amgUntagged?: boolean;
  tpsRatings?: number[];
  tpsFavorite?: boolean;
  tpsAccolades?: string[];
  tpsUntagged?: boolean;
  criticalReceptionMatch?: "all" | "any";
}

/**
 * The filter half of an album listing's params — everything that selects *which*
 * albums match. Declared here rather than imported from ItemsListing.vue so this
 * pure helper (and its tests) don't depend on the component's type surface;
 * LoadDataParams extends it, so the two cannot drift.
 */
export interface AlbumListingFilterParams extends ReviewFilterParams {
  favoritesOnly?: boolean;
  search?: string;
  albumType?: string[];
  provider?: string[];
  genreIds?: number | number[];
}

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
export function albumFiltersFromParams(
  params: Partial<AlbumListingFilterParams>,
) {
  return {
    favorite: params.favoritesOnly || undefined,
    search: params.search,
    album_types: params.albumType,
    provider: params.provider?.length ? params.provider : undefined,
    genre: params.genreIds,
    critical_reception_filter: buildCriticalReceptionFilter(params),
  };
}

/**
 * Marshal the same filter half into getLibraryAlbumsCount options.
 *
 * The count query mirrors the list query's filters, so keeping the shared five
 * keys here stops the Albums and Listen Later views from drifting into counting
 * something other than what they list. Provider stays caller-side: the two views
 * legitimately differ on it (Albums drops the total when a provider filter is
 * active, Listen Later forwards it).
 */
export function albumCountArgsFromParams(
  params: Partial<AlbumListingFilterParams>,
) {
  return {
    favorite_only: params.favoritesOnly || undefined,
    album_types: params.albumType?.length ? params.albumType : undefined,
    critical_reception_filter: buildCriticalReceptionFilter(params),
    search: params.search || undefined,
    genre: params.genreIds,
  };
}
