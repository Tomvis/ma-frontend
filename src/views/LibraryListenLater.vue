<template>
  <ItemsListing
    ref="listingRef"
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
    :suppress-added-banner="true"
    :total="total"
    :show-album-type-filter="true"
    :show-provider-filter="true"
    :show-dr-filter="true"
    :show-amg-filter="true"
    :show-tps-filter="true"
    :extra-menu-items="extraMenuItems"
    :primary-bulk-action="primaryBulkAction"
  />
</template>

<script setup lang="ts">
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import type { ToolBarMenuItem } from "@/components/Toolbar.vue";
import {
  ALBUM_SORT_KEYS,
  buildCriticalReceptionFilter,
} from "@/helpers/criticalReception";
import api from "@/plugins/api";
import {
  EventType,
  QueueOption,
  type Album,
  type EventMessage,
  type MediaItemTypeOrItemMapping,
} from "@/plugins/api/interfaces";
import { useListenLater } from "@/composables/useListenLater";
import { store } from "@/plugins/store";
import { BookmarkCheck } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { toast } from "vue-sonner";
import { useI18n } from "vue-i18n";

defineOptions({ name: "ListenLater" });

const { t } = useI18n();
const { prime, remove } = useListenLater();
const total = ref<number | undefined>(0);

// Same sort surface as LibraryAlbums (ALBUM_SORT_KEYS), plus listen-later–specific
// keys. "listen_later_added_at_desc" is the default — newest pick first, the
// inbox-like ordering Roon uses.
const sortKeys = [
  "listen_later_added_at_desc",
  "listen_later_added_at",
  ...ALBUM_SORT_KEYS,
];

const loadItems = async (params: LoadDataParams) => {
  trackedSetTotals(params);
  const albums = await api.getLibraryAlbums({
    favorite: params.favoritesOnly || undefined,
    search: params.search,
    limit: params.limit,
    offset: params.offset,
    order_by: params.sortBy || "listen_later_added_at_desc",
    album_types: params.albumType,
    provider:
      params.provider && params.provider.length > 0
        ? params.provider
        : undefined,
    genre: params.genreIds,
    critical_reception_filter: buildCriticalReceptionFilter(params),
    listen_later: true, // this view shows saved-for-later items only
  });
  for (const album of albums) prime(album as Album);
  return albums;
};

const setTotals = async (params: LoadDataParams) => {
  // The server count mirrors library_items' filters (provider included), so a
  // provider-filtered view can still be counted accurately — forward provider
  // rather than collapsing total to undefined and disabling play/empty-all.
  total.value = await api.getLibraryAlbumsCount({
    favorite_only: params.favoritesOnly || undefined,
    album_types: params.albumType || undefined,
    critical_reception_filter: buildCriticalReceptionFilter(params),
    listen_later_only: true,
    search: params.search || undefined,
    genre: params.genreIds,
    provider:
      params.provider && params.provider.length > 0
        ? params.provider
        : undefined,
  });
};

// Pull every saved album that matches the CURRENT filters in one page. Snapshots
// lastParams (the filter set loadItems last ran with) so play-all / empty-all act
// on exactly the rows the listing shows, not an arbitrary top-N of the unfiltered
// pile. Shared by playAll and emptyAll so the marshalling lives in one place.
const fetchAllFiltered = async (): Promise<Album[]> => {
  const p = lastParams.value;
  const albums = await api.getLibraryAlbums({
    favorite: p?.favoritesOnly || undefined,
    search: p?.search,
    limit: Math.max(total.value ?? 1, 1),
    offset: 0,
    order_by: "listen_later_added_at_desc",
    album_types: p?.albumType,
    provider: p?.provider && p.provider.length > 0 ? p.provider : undefined,
    genre: p?.genreIds,
    critical_reception_filter: p ? buildCriticalReceptionFilter(p) : undefined,
    listen_later: true,
  });
  return albums as Album[];
};

// Remove a batch of albums concurrently and report the outcome with one pair of
// bulk toasts. Removals are independent server calls, so run them in parallel and
// derive removed/failed from the settled statuses (1-1 with the prior per-item
// try/catch counters). Never throws — failures are surfaced via the toast only.
const removeAlbumsWithToasts = async (albums: Album[]) => {
  const results = await Promise.allSettled(albums.map((a) => remove(a)));
  let removed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      removed++;
    } else {
      console.error(r.reason);
      failed++;
    }
  }
  if (removed) toast.success(t("listen_later.toast_bulk_removed", [removed]));
  if (failed) toast.error(t("listen_later.toast_bulk_failed", [failed]));
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
    {
      label: "listen_later.empty_all",
      icon: "mdi-bookmark-off-outline",
      disabled: !total.value,
      overflowAllowed: true,
      action: () => emptyAll(),
    },
  ];
});

// Primary bulk verb wired into ItemsListing's selection snackbar — appears
// next to the generic "Actions" button when 2+ items are checked, so a
// user mass-clearing the inbox can do it in one click instead of via the
// context menu.
const primaryBulkAction = {
  label: "listen_later.remove_selected",
  icon: "mdi-bookmark-off-outline",
  color: "warning",
  // Confirm before nuking — matches the toolbar-level "Empty Listen Later"
  // affordance and prevents fat-fingered mass deletion.
  confirmLabel: "listen_later.confirm_bulk_remove",
  handler: async (items: MediaItemTypeOrItemMapping[]) => {
    await removeAlbumsWithToasts(items as Album[]);
  },
};

async function emptyAll() {
  if (!total.value) return;
  if (!confirm(t("listen_later.confirm_empty_all", [total.value]))) return;
  try {
    // Pull every saved album matching the current filters, then drop them through
    // removeAlbumsWithToasts so the optimistic cache stays in sync.
    const all = await fetchAllFiltered();
    await removeAlbumsWithToasts(all);
  } catch (err) {
    console.error(err);
    toast.error(t("listen_later.toast_bulk_failed", [total.value]));
  }
}

async function playAll(shuffle: boolean) {
  const player = store.activePlayer;
  if (!player) return;
  try {
    // Pull a single page of the filtered saved albums — server resolves URIs to a
    // queue. fetchAllFiltered mirrors the active filters so "Play all" plays
    // exactly the rows the user is looking at.
    const all = await fetchAllFiltered();
    if (!all.length) return;
    // Resolve the target queue the same way playMedia does, then set its shuffle
    // state explicitly: play_media has no "shuffle" arg (sort_by="random" is a
    // silent no-op server-side), so the queue's shuffle_enabled flag is what makes
    // REPLACE shuffle the enqueued items.
    const queueId =
      player.active_source && player.active_source in api.queues
        ? player.active_source
        : player.player_id;
    if (queueId) await api.queueCommandShuffle(queueId, shuffle);
    // NOTE: upstream dropped the `radio_mode` positional arg from playMedia;
    // the args are now (media, option, start_item, queue_id, sort_by).
    await api.playMedia(
      all.map((a) => a.uri),
      QueueOption.REPLACE,
      undefined,
      queueId,
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

// Snapshot the latest filter set so the MEDIA_ITEM_UPDATED handler can
// re-count with the current filters instead of resetting to the unfiltered
// total. setTotals() updates this every time loadItems runs.
const lastParams = ref<LoadDataParams | undefined>(undefined);

const trackedSetTotals = async (params: LoadDataParams) => {
  lastParams.value = params;
  await setTotals(params);
};

// Template ref to the embedded ItemsListing — used to force a server reload
// when a listen-later flip means a row no longer belongs in this view.
const listingRef = ref<{ refresh?: () => void } | null>(null);

// Coalesce listen-later removals into a single reload. Bulk-remove fires many
// MEDIA_ITEM_UPDATED events back-to-back; a per-event refresh would re-fetch
// the page once for each, hammering the server during inbox-clearing churn.
// The listing refresh re-runs loadItems → trackedSetTotals → setTotals, so it
// also re-counts; the false branch relies on that instead of a direct setTotals.
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleListingRefresh = () => {
  if (refreshTimer !== null) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    listingRef.value?.refresh?.();
  }, 250);
};

// A row flipped to listen_later=true elsewhere belongs in this view but isn't
// fetched into the page on its own; it only bumps the count. Debounce that
// recount on the same 250ms window so an inbound burst is a single count RPC.
let recountTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleRecount = () => {
  if (recountTimer !== null) return;
  recountTimer = setTimeout(() => {
    recountTimer = null;
    if (lastParams.value) setTotals(lastParams.value);
  }, 250);
};

onMounted(() => {
  // Refresh count + drop now-stale rows when the listen-later flag flips
  // anywhere. applyMediaEventToItems on the embedded listing only replaces
  // in place, so a row flipped to listen_later=false would otherwise linger
  // visible until navigation.
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const data = evt.data as Album | undefined;
      if (data && typeof data.listen_later === "boolean") {
        if (data.listen_later === false) {
          // The coalesced listing refresh re-counts via trackedSetTotals, so no
          // direct setTotals here — that would duplicate the count query.
          scheduleListingRefresh();
        } else {
          // Added to the inbox elsewhere: recount (debounced) with the active
          // CR / album-type / favorites filters carried through lastParams.
          scheduleRecount();
        }
      }
    },
  );
  onBeforeUnmount(() => {
    unsub();
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (recountTimer !== null) {
      clearTimeout(recountTimer);
      recountTimer = null;
    }
  });
});
</script>
