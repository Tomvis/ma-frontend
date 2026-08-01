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
import { onLibrarySyncCompleted } from "@/composables/useLibrarySync";
import { ALBUM_SORT_KEYS } from "@/helpers/albumSort";
import {
  albumCountArgsFromParams,
  albumFiltersFromParams,
  buildCriticalReceptionFilter,
} from "@/helpers/criticalReception";
import api from "@/plugins/api";
import { MediaType } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { Disc3 } from "@lucide/vue";
import { onBeforeUnmount, onMounted, ref } from "vue";

defineOptions({
  name: "Albums",
});

const updateAvailable = ref<boolean>(false);
const total = ref(store.libraryAlbumsCount);

const sortKeys = [...ALBUM_SORT_KEYS];

onMounted(() => {
  // The per-view MEDIA_ITEM_ADDED listener is intentionally gone: ItemsListing
  // now bridges add/update/delete events itself (including across unmounts),
  // so duplicating it here only produced redundant refresh prompts.
  // Sync completion is a separate signal though — the server suppresses
  // per-item events while a provider library sync runs — so keep upstream's
  // sync hook to refresh once this media type finishes syncing.
  const unsubSync = onLibrarySyncCompleted(MediaType.ALBUM, () => {
    updateAvailable.value = true;
  });
  onBeforeUnmount(unsubSync);
});

const loadItems = async function (params: LoadDataParams) {
  updateAvailable.value = false;
  // Only count on the first page: the total belongs to the filter set, and any
  // filter change resets offset to 0, so recounting per scrolled page is waste.
  if (!params.offset) setTotals(params);
  return await api.getLibraryAlbums({
    ...albumFiltersFromParams(params),
    limit: params.limit,
    offset: params.offset,
    order_by: params.sortBy,
  });
};

const setTotals = async function (params: LoadDataParams) {
  const crFilter = buildCriticalReceptionFilter(params);
  // albumType/provider are arrays: an empty [] is truthy, so guard on length —
  // otherwise clearing a filter back to [] defeats the cached-count fast path
  // (and would send album_types: [] to the server every reload).
  if (
    !params.favoritesOnly &&
    !params.albumType?.length &&
    !params.provider?.length &&
    !params.search &&
    !params.genreIds &&
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
    albumCountArgsFromParams(params),
  );
};
</script>
