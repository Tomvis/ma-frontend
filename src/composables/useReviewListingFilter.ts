// Fork: the review filters (DR / AMG / TPS) as one field of the library
// title bar's Filters panel, which opens their own dialog.
import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import {
  REVIEW_SOURCES,
  reviewFilterCount,
  type ReviewFilterParams,
  type ReviewSource,
} from "@/helpers/criticalReception";
import type { ListingDialogFilter } from "@/helpers/listing_filters";

export const REVIEW_LISTING_FILTER_ID = "reviews";

/** Which review sources the listing filters by. */
interface ReviewFilterFlags {
  showDrFilter?: boolean;
  showAmgFilter?: boolean;
  showTpsFilter?: boolean;
}

const offers = (flags: Readonly<ReviewFilterFlags>, source: ReviewSource) =>
  ({
    dr: flags.showDrFilter,
    amg: flags.showAmgFilter,
    tps: flags.showTpsFilter,
  })[source] === true;

/**
 * The Filters panel field for the review filters, or none where the listing
 * offers no review source. It names the sources that narrow the listing.
 */
export function useReviewListingFilter(
  flags: Readonly<ReviewFilterFlags>,
  params: Ref<ReviewFilterParams>,
  open: () => void,
) {
  const { t } = useI18n();

  return computed<ListingDialogFilter[]>(() => {
    const offered = REVIEW_SOURCES.filter((source) => offers(flags, source));
    if (!offered.length) return [];
    const counts = offered.map((source) => ({
      source,
      count: reviewFilterCount(params.value, source),
    }));
    const narrowing = counts.filter(({ count }) => count > 0);
    return [
      {
        kind: "dialog",
        id: REVIEW_LISTING_FILTER_ID,
        label: t("review_filters.field_label"),
        summary: narrowing.length
          ? narrowing
              .map(({ source }) => t(`review_filters.source_short.${source}`))
              .join(", ")
          : t("review_filters.any_review"),
        activeCount: counts.reduce((sum, { count }) => sum + count, 0),
        open,
      },
    ];
  });
}
