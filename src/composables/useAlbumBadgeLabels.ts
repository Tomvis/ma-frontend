import { computed, type ComputedRef, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Album } from "@/plugins/api/interfaces";
import { useAlbumTags } from "@/composables/useAlbumTags";
import { useListenLater } from "@/composables/useListenLater";
import {
  formatDr,
  formatScore,
  type AlbumTags,
  type SourceTags,
} from "@/helpers/album_tags";

export interface AlbumBadgeLabels {
  tags: ComputedRef<AlbumTags>;
  savedForLater: ComputedRef<boolean>;
  formatScore: (n: number) => string;
  formatDr: (n: number) => string;
  drTitle: ComputedRef<string>;
  amgTitle: ComputedRef<string>;
  tpsTitle: ComputedRef<string>;
}

/**
 * Shared label/score logic for the album critical-reception badge components
 * (AlbumListBadges + AlbumPanelBadges), which render the same data in two
 * layouts. Keeping the tooltip/score formatting in one place stops the list-row
 * chips and on-cover badges from drifting apart.
 */
export function useAlbumBadgeLabels(
  albumRef: Ref<Album | undefined>,
): AlbumBadgeLabels {
  const { t } = useI18n();
  const tags = useAlbumTags(albumRef);
  const { isSaved } = useListenLater();

  const savedForLater = computed(() => isSaved(albumRef.value));

  const drTitle = computed(() => {
    const dr = tags.value.dr;
    if (!dr) return "";
    const verdict = t(`critical_reception.dr_quality.${dr.quality}`);
    // When falling back to AMG's review-reported DR (no measured value yet),
    // signal that in the tooltip so the badge isn't claiming to be a measurement.
    const suffix =
      dr.source === "amg" ? ` · ${t("critical_reception.amg_dr")}` : "";
    return `DR ${formatDr(dr.value)} — ${verdict}${suffix}`;
  });

  // One tooltip builder for both review sources: the score (with the source's own
  // 5/10 scale) wins when present, else a "personal pick" label only when the
  // source is actually flagged favorite — a rating-less label/author-only entry
  // isn't a pick (matches CriticalReception.vue, which renders nothing then).
  const sourceTitle = (src?: SourceTags): string => {
    if (!src) return "";
    if (src.rating !== undefined) {
      return t("critical_reception.score_with_max", {
        score: formatScore(src.rating),
        max: src.scale,
      });
    }
    if (src.favorite) return t("critical_reception.favorite_pick");
    return "";
  };

  const amgTitle = computed(() => sourceTitle(tags.value.amg));
  const tpsTitle = computed(() => sourceTitle(tags.value.tps));

  return {
    tags,
    savedForLater,
    formatScore,
    formatDr,
    drTitle,
    amgTitle,
    tpsTitle,
  };
}
