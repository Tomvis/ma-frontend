<template>
  <ItemsListing
    itemtype="albums"
    path="libraryalbums"
    :show-provider="false"
    :show-favorites-only-filter="true"
    :load-paged-data="loadItems"
    :sort-keys="sortKeys"
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
import {
  ALBUM_SORT_KEYS,
  buildCriticalReceptionFilter,
} from "@/helpers/criticalReception";
import api from "@/plugins/api";
import { store } from "@/plugins/store";
import { Disc3 } from "lucide-vue-next";
import { ref } from "vue";

defineOptions({
  name: "Albums",
});

const total = ref(store.libraryAlbumsCount);

const sortKeys = [...ALBUM_SORT_KEYS];

const loadItems = async function (params: LoadDataParams) {
  setTotals(params);
  return await api.getLibraryAlbums({
    favorite: params.favoritesOnly || undefined,
    search: params.search,
    limit: params.limit,
    offset: params.offset,
    order_by: params.sortBy,
    album_types: params.albumType,
    provider:
      params.provider && params.provider.length > 0
        ? params.provider
        : undefined,
    genre: params.genreIds,
    critical_reception_filter: buildCriticalReceptionFilter(params),
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
  total.value = await api.getLibraryAlbumsCount({
    favorite_only: params.favoritesOnly || undefined,
    album_types: params.albumType?.length ? params.albumType : undefined,
    critical_reception_filter: crFilter,
    search: params.search || undefined,
    genre: params.genreIds,
  });
};
</script>
