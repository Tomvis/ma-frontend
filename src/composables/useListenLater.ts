import { reactive, computed, type ComputedRef } from "vue";
import api from "@/plugins/api";
import {
  EventType,
  type Album,
  type EventMessage,
} from "@/plugins/api/interfaces";

// Roon-style "Listen Later" — a per-user pile of albums saved to come back to.
// Backed by `albums.listen_later` on the server (see DB schema 43+). State is
// persistent, paginated, and filterable on the server, so this composable just
// caches "is the URI saved?" answers for hot lookups in the UI.
//
// The cache is small (only album URIs that have been seen), populated as
// callers render pages or look up state. The MEDIA_ITEM_UPDATED event keeps
// it in sync whenever the server flips the flag — for example when a separate
// browser tab toggles the same album.

interface ListenLaterCache {
  // Set of URIs known to be saved. Anything not present is "not saved" or
  // "unknown" — callers can hydrate by calling `prime(album)`.
  saved: Set<string>;
}

const cache = reactive<ListenLaterCache>({
  saved: new Set<string>(),
});

let subscribed = false;

function ensureSubscription() {
  if (subscribed) return;
  subscribed = true;
  // Listen for upstream changes so optimistic local state stays consistent
  // with the server. We can't filter by media_type here cheaply, so we just
  // check shape on each event.
  api.subscribe(EventType.MEDIA_ITEM_UPDATED, (evt: EventMessage) => {
    const data = evt.data as Album | undefined;
    if (!data || !("uri" in data)) return;
    if (typeof data.listen_later !== "boolean") return;
    syncFromServer(data);
  });
}

function syncFromServer(album: Album) {
  if (!album?.uri) return;
  if (album.listen_later) {
    cache.saved.add(album.uri);
  } else {
    cache.saved.delete(album.uri);
  }
}

export interface ListenLaterApi {
  count: ComputedRef<number>;
  isListenLater: (uri: string | undefined) => boolean;
  // Hydrate cache from a freshly-fetched album (e.g. after `getAlbum` or list
  // load). Cheap — just an `add` or `delete` on the Set.
  prime: (album: Album | undefined) => void;
  // Toggle. Optimistically updates the local cache, then calls the server.
  // On failure the optimistic flip is reverted and the rejection rethrown so
  // the caller can toast.
  toggle: (album: Album) => Promise<boolean>;
  add: (album: Album) => Promise<void>;
  remove: (album: Album) => Promise<void>;
}

export function useListenLater(): ListenLaterApi {
  ensureSubscription();

  const count = computed(() => cache.saved.size);

  const isListenLater = (uri: string | undefined): boolean => {
    if (!uri) return false;
    return cache.saved.has(uri);
  };

  const prime = (album: Album | undefined) => {
    if (!album) return;
    if (typeof album.listen_later !== "boolean") return;
    syncFromServer(album);
  };

  const add = async (album: Album) => {
    if (!album?.uri) return;
    if (cache.saved.has(album.uri)) return;
    cache.saved.add(album.uri);
    try {
      await api.addAlbumToListenLater(album);
    } catch (err) {
      cache.saved.delete(album.uri);
      throw err;
    }
  };

  const remove = async (album: Album) => {
    if (!album?.uri) return;
    if (!cache.saved.has(album.uri)) return;
    cache.saved.delete(album.uri);
    try {
      // Server expects a library item id; non-library albums are never saved
      // since the server adds-to-library on flip-to-true. The library mapping
      // is the album's own item_id when provider == 'library', or the URI as
      // a fallback that the server can resolve.
      const id = album.provider === "library" ? album.item_id : album.uri;
      await api.removeAlbumFromListenLater(id);
    } catch (err) {
      cache.saved.add(album.uri);
      throw err;
    }
  };

  const toggle = async (album: Album): Promise<boolean> => {
    if (!album?.uri) return false;
    if (cache.saved.has(album.uri)) {
      await remove(album);
      return false;
    }
    await add(album);
    return true;
  };

  return { count, isListenLater, prime, toggle, add, remove };
}
