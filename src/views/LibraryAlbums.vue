<template>
  <ItemsListing
    itemtype="albums"
    path="libraryalbums"
    :show-provider="false"
    :show-favorites-only-filter="true"
    :load-paged-data="loadItems"
    :sort-keys="sortKeys"
    :update-available="updateAvailable"
    :title="$t('albums')"
    :allow-key-hooks="true"
    :show-search-button="true"
    :show-genre-filter="true"
    :icon="Disc3"
    :restore-state="true"
    :total="total"
    :show-album-type-filter="true"
    :show-provider-filter="true"
    :show-dr-filter="true"
    :show-amg-filter="true"
    :show-tps-filter="true"
  />
</template>

<script setup lang="ts">
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import api from "@/plugins/api";
import {
  EventMessage,
  EventType,
  type CriticalReceptionFilter,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { Disc3 } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  name: "Albums",
});

const updateAvailable = ref<boolean>(false);
const total = ref(store.libraryAlbumsCount);

const sortKeys = [
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

onMounted(() => {
  // signal if/when items get added within this library
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_ADDED,
    (evt: EventMessage) => {
      // signal user that there might be updated info available for this item
      if (evt.object_id?.startsWith("library://artist")) {
        updateAvailable.value = true;
      }
    },
  );
  onBeforeUnmount(unsub);
});

const buildCriticalReceptionFilter = function (
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
  return Object.keys(f).length ? f : undefined;
};

const loadItems = async function (params: LoadDataParams) {
  updateAvailable.value = false;
  setTotals(params);
  return await api.getLibraryAlbums(
    params.favoritesOnly || undefined,
    params.search,
    params.limit,
    params.offset,
    params.sortBy,
    params.albumType,
    params.provider && params.provider.length > 0 ? params.provider : undefined,
    params.genreIds,
    buildCriticalReceptionFilter(params),
  );
};

const setTotals = async function (params: LoadDataParams) {
  const crFilter = buildCriticalReceptionFilter(params);
  if (
    !params.favoritesOnly &&
    !params.albumType &&
    !params.provider &&
    !crFilter
  ) {
    total.value = store.libraryAlbumsCount;
    return;
  }
  // When provider filter is active, we can't get accurate count from the count endpoint
  // The total will be determined by the actual results returned
  if (params.provider && params.provider.length > 0) {
    total.value = undefined;
    return;
  }
  total.value = await api.getLibraryAlbumsCount(
    params.favoritesOnly || undefined,
    params.albumType || undefined,
    crFilter,
  );
};
</script>
