<template>
  <ItemsListing
    itemtype="albums"
    path="listenlater"
    :show-provider="false"
    :show-favorites-only-filter="true"
    :load-paged-data="loadItems"
    :sort-keys="sortKeys"
    :title="$t('listen_later.title')"
    :allow-key-hooks="true"
    :show-search-button="true"
    :show-genre-filter="true"
    :icon="BookmarkCheck"
    :restore-state="true"
    :total="total"
    :show-album-type-filter="true"
    :show-provider-filter="true"
    :show-dr-filter="true"
    :show-amg-filter="true"
    :show-tps-filter="true"
    :extra-menu-items="extraMenuItems"
  />
</template>

<script setup lang="ts">
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import api from "@/plugins/api";
import {
  EventType,
  QueueOption,
  type Album,
  type CriticalReceptionFilter,
  type EventMessage,
} from "@/plugins/api/interfaces";
import { useListenLater } from "@/composables/useListenLater";
import { store } from "@/plugins/store";
import { BookmarkCheck } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { toast } from "vue-sonner";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ListenLater" });

const { t } = useI18n();
const { prime } = useListenLater();
const total = ref<number | undefined>(0);

// Same sort surface as LibraryAlbums, plus listen-later–specific keys.
// "listen_later_added_at_desc" is the default — newest pick first, the
// inbox-like ordering Roon uses.
const sortKeys = [
  "listen_later_added_at_desc",
  "listen_later_added_at",
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
];

const buildCriticalReceptionFilter = (
  params: LoadDataParams,
): CriticalReceptionFilter | undefined => {
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
  return Object.keys(f).length ? f : undefined;
};

const loadItems = async (params: LoadDataParams) => {
  setTotals(params);
  const albums = await api.getLibraryAlbums(
    params.favoritesOnly || undefined,
    params.search,
    params.limit,
    params.offset,
    params.sortBy || "listen_later_added_at_desc",
    params.albumType,
    params.provider && params.provider.length > 0 ? params.provider : undefined,
    params.genreIds,
    buildCriticalReceptionFilter(params),
    true, // listen_later: this view shows saved-for-later items only
  );
  for (const album of albums) prime(album as Album);
  return albums;
};

const setTotals = async (params: LoadDataParams) => {
  // Provider filter prevents an accurate server-side count — fall back to
  // the result-length heuristic the way LibraryAlbums does.
  if (params.provider && params.provider.length > 0) {
    total.value = undefined;
    return;
  }
  total.value = await api.getLibraryAlbumsCount(
    params.favoritesOnly || undefined,
    params.albumType || undefined,
    buildCriticalReceptionFilter(params),
    true,
  );
};

// "Play all" / "Shuffle all" surfaced on the standard toolbar as extra menu
// entries — the only listen-later–specific actions worth keeping after
// dropping the custom hero. Disabled when there is no active player.
const extraMenuItems = computed<ToolBarMenuItem[]>(() => {
  const noPlayer = !store.activePlayer;
  return [
    {
      label: "listen_later.play_all",
      icon: "mdi-play-circle-outline",
      disabled: noPlayer || !total.value,
      overflowAllowed: true,
      action: () => playAll(false),
    },
    {
      label: "listen_later.shuffle_all",
      icon: "mdi-shuffle-variant",
      disabled: noPlayer || !total.value,
      overflowAllowed: true,
      action: () => playAll(true),
    },
  ];
});

async function playAll(shuffle: boolean) {
  if (!store.activePlayer) return;
  try {
    // Pull a single page sized to the total — server resolves URIs to a queue.
    const all = await api.getLibraryAlbums(
      undefined,
      undefined,
      Math.max(total.value ?? 1, 1),
      0,
      "listen_later_added_at_desc",
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    if (!all.length) return;
    await api.playMedia(
      all.map((a) => a.uri),
      QueueOption.REPLACE,
      false,
      undefined,
      undefined,
      shuffle ? "random" : undefined,
    );
    toast.success(
      shuffle
        ? t("listen_later.toast_shuffled")
        : t("listen_later.toast_playing"),
    );
  } catch (err) {
    console.error(err);
    toast.error(t("listen_later.toast_play_failed"));
  }
}

onMounted(() => {
  // Refresh count when the listen-later flag flips anywhere.
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const data = evt.data as Album | undefined;
      if (data && typeof data.listen_later === "boolean") {
        // Re-fetch via the same path used on initial mount; reusing setTotals
        // keeps provider-filter handling consistent.
        api
          .getLibraryAlbumsCount(undefined, undefined, undefined, true)
          .then((n) => {
            total.value = n;
          });
      }
    },
  );
  onBeforeUnmount(unsub);
});
</script>
