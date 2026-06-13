import type { LoadDataParams } from "@/components/ItemsListing.vue";
import type { CriticalReceptionFilter } from "@/plugins/api/interfaces";

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
  params: LoadDataParams,
): CriticalReceptionFilter | undefined {
  const f: CriticalReceptionFilter = {};
  if (params.drBuckets?.length) f.dr_buckets = params.drBuckets;
  if (params.amgRatings?.length) f.amg_ratings = params.amgRatings;
  if (params.amgFavorite) f.amg_favorite = true;
  if (params.amgAccolades?.length) f.amg_accolades = params.amgAccolades;
  if (params.amgUntagged) f.amg_untagged = true;
  if (params.tpsRatings?.length) f.tps_ratings = params.tpsRatings;
  if (params.tpsFavorite) f.tps_favorite = true;
  if (params.tpsAccolades?.length) f.tps_accolades = params.tpsAccolades;
  if (params.tpsUntagged) f.tps_untagged = true;
  if (Object.keys(f).length === 0) return undefined;
  // Only emit match mode when ANY is selected; the server defaults to ALL.
  if (params.criticalReceptionMatch === "any") {
    f.critical_reception_match = "any";
  }
  return f;
}
