/**
 * The preferences key a listing stores its "last used" sort under.
 *
 * Scoped to the item type *and* the listing's declared default (`sortKeys[0]`).
 * Item type alone is too coarse: library Albums and Listen Later are both
 * "albums" but document different defaults, so a single bucket let a year sort
 * chosen in Albums decide how the Listen Later inbox first opens. Instances of
 * the *same* listing (one artist's albums vs another's) declare the same keys,
 * so they still share one bucket and a chosen sort still sticks when moving
 * between them.
 *
 * Listings that declare no sort keys have no default to scope by and fall back
 * to the bare item-type key; they can never read a sort from it either, since
 * every candidate is rejected for not being among their (empty) sort keys.
 */
export function listingSortPreferenceKey(
  itemtype: string,
  sortKeys: readonly string[],
): string {
  const declaredDefault = sortKeys[0];
  if (!declaredDefault) return `itemsListingSort.${itemtype}`;
  return `itemsListingSort.${itemtype}.${declaredDefault}`;
}

/**
 * Resolve which sort key a listing should use, honouring (in order):
 *   1. a per-listing override — the sort saved for this specific listing
 *      instance (e.g. the order chosen on one particular artist)
 *   2. a shared default for the listing — the user's most recently used sort,
 *      inherited by instances they haven't explicitly customised (see
 *      `listingSortPreferenceKey` for how far that sharing reaches)
 *   3. the listing's first declared sort key
 *
 * Candidates that aren't among `sortKeys` are ignored, so a shared default can
 * never select an invalid sort.
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
