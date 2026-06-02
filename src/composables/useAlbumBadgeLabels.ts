import { computed, type ComputedRef, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Album } from "@/plugins/api/interfaces";
import { useAlbumTags } from "@/composables/useAlbumTags";
import { useListenLater } from "@/composables/useListenLater";
import type { AlbumTags } from "@/helpers/album_tags";

export interface AlbumBadgeLabels {
  tags: ComputedRef<AlbumTags>;
  savedForLater: ComputedRef<boolean>;
  formatScore: (n: number) => string;
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
  const { isListenLater } = useListenLater();

  const savedForLater = computed(
    () =>
      albumRef.value?.listen_later === true ||
      isListenLater(albumRef.value?.uri),
  );

  const formatScore = (n: number): string =>
    Number.isInteger(n) ? n.toFixed(1) : `${n}`;

  const drTitle = computed(() => {
    const dr = tags.value.dr;
    if (!dr) return "";
    const verdict = t(`critical_reception.dr_quality.${dr.quality}`);
    // When falling back to AMG's review-reported DR (no measured value yet),
    // signal that in the tooltip so the badge isn't claiming to be a measurement.
    const suffix =
      dr.source === "amg" ? ` · ${t("critical_reception.amg_dr")}` : "";
    return `DR ${dr.value} — ${verdict}${suffix}`;
  });

  const amgTitle = computed(() => {
    const a = tags.value.amg;
    if (!a) return "";
    if (a.rating !== undefined) {
      return t("critical_reception.score_with_max", {
        score: formatScore(a.rating),
        max: 5,
      });
    }
    // Only call it a "personal pick" when the source is actually flagged as a
    // favorite; a rating-less label/author-only entry isn't a pick. Matches
    // CriticalReception.vue, which renders nothing in that case.
    if (a.favorite) return t("critical_reception.favorite_pick");
    return "";
  });

  const tpsTitle = computed(() => {
    const tp = tags.value.tps;
    if (!tp) return "";
    if (tp.rating !== undefined) {
      return t("critical_reception.score_with_max", {
        score: formatScore(tp.rating),
        max: 10,
      });
    }
    if (tp.favorite) return t("critical_reception.favorite_pick");
    return "";
  });

  return { tags, savedForLater, formatScore, drTitle, amgTitle, tpsTitle };
}
