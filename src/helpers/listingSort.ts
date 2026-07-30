/**
 * Resolve which sort key a listing should use, honouring (in order):
 *   1. a per-listing override — the sort saved for this specific listing
 *      instance (e.g. the order chosen on one particular artist)
 *   2. a global default for the item type — the user's most recently used
 *      sort, inherited by instances they haven't explicitly customised
 *   3. the listing's first declared sort key
 *
 * Candidates that aren't among `sortKeys` are ignored, so a global default
 * carried over from a sibling listing that declares different keys can never
 * select an invalid sort.
 */
export function resolveSortPreference(
  perListingSort: string | undefined,
  globalSort: string | undefined,
  sortKeys: string[],
): string {
  if (perListingSort && sortKeys.includes(perListingSort)) {
    return perListingSort;
  }
  if (globalSort && sortKeys.includes(globalSort)) {
    return globalSort;
  }
  return sortKeys[0];
}
