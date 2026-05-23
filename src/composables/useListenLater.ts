import { reactive, computed, type ComputedRef } from "vue";
import api from "@/plugins/api";
import {
  EventType,
  MediaType,
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
    const originalUri = album.uri;
    cache.saved.add(originalUri);
    try {
      const persisted = await api.addAlbumToListenLater(album);
      // Server persists a library:// row. If the caller passed a streaming-
      // provider URI (e.g. spotify://album/abc), swap the cache key over to
      // the canonical library URI returned from the server. Keeping both
      // would let a later remove() against the original URI silently fail to
      // clear the server flag — see remove() below for the lookup fallback
      // that backstops this for stale state from prior sessions.
      if (persisted?.uri && persisted.uri !== originalUri) {
        cache.saved.delete(originalUri);
        cache.saved.add(persisted.uri);
      }
    } catch (err) {
      cache.saved.delete(originalUri);
      throw err;
    }
  };

  const remove = async (album: Album) => {
    if (!album?.uri) return;
    // Server's set_listen_later does int(item_id), so resolve to a numeric
    // library id before sending. Library-provider items already carry it as
    // album.item_id; for everything else, parse it out of the canonical
    // library URI form ("library://album/{N}") that any persisted
    // listen-later album wears.
    const libUriMatch = album.uri.match(/^library:\/\/album\/(\d+)$/);
    let id: string | undefined =
      album.provider === "library" ? album.item_id : libUriMatch?.[1];
    if (id === undefined && cache.saved.has(album.uri)) {
      // Stale-cache fallback: the URI is flagged saved locally but isn't in
      // library form — likely a streaming-provider Album reference whose
      // server-side row lives under a different library:// URI (e.g. add()
      // was called in a prior session that pre-dates the URI-swap fix above).
      // Look up the matching library row by provider+id so we can actually
      // clear the flag instead of silently dropping the cache entry.
      try {
        const libraryAlbum = (await api.getLibraryItem(
          MediaType.ALBUM,
          album.item_id,
          album.provider,
        )) as Album | null;
        const libId = libraryAlbum?.item_id;
        if (libId !== undefined && libId !== null) {
          id = String(libId);
          if (libraryAlbum?.uri) cache.saved.delete(libraryAlbum.uri);
        }
      } catch {
        // Lookup failed — fall through to the "no row exists" branch below.
      }
    }
    if (id === undefined) {
      // Not a library album and no matching row was found → nothing on the
      // server to clear. Drop any stale cache entry and exit cleanly.
      cache.saved.delete(album.uri);
      return;
    }
    const wasCached = cache.saved.has(album.uri);
    cache.saved.delete(album.uri);
    try {
      await api.removeAlbumFromListenLater(id);
    } catch (err) {
      if (wasCached) cache.saved.add(album.uri);
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
