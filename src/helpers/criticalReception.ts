import type { LoadDataParams } from "@/components/ItemsListing.vue";
import type { CriticalReceptionFilter } from "@/plugins/api/interfaces";

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
  if (params.amgLabels?.length) f.amg_labels = params.amgLabels;
  if (params.amgUntagged) f.amg_untagged = true;
  if (params.tpsRatings?.length) f.tps_ratings = params.tpsRatings;
  if (params.tpsFavorite) f.tps_favorite = true;
  if (params.tpsLabels?.length) f.tps_labels = params.tpsLabels;
  if (params.tpsUntagged) f.tps_untagged = true;
  if (Object.keys(f).length === 0) return undefined;
  // Only emit match mode when ANY is selected; the server defaults to ALL.
  if (params.criticalReceptionMatch === "any") {
    f.critical_reception_match = "any";
  }
  return f;
}
