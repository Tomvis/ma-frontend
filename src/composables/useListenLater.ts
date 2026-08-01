import { reactive } from "vue";
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

function isListenLater(uri: string | undefined): boolean {
  if (!uri) return false;
  return cache.saved.has(uri);
}

export interface ListenLaterApi {
  // Saved-state for a whole album: trusts the server flag, falling back to the
  // optimistic cache keyed by URI. The single source of truth for "is this album
  // in the Listen Later pile?" across the button and the badge components.
  isSaved: (album: Album | undefined) => boolean;
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

  const isSaved = (album: Album | undefined): boolean =>
    album?.listen_later === true || isListenLater(album?.uri);

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
      // provider URI (e.g. spotify://album/abc), also cache the canonical
      // library URI returned from the server, but keep the ORIGINAL key too.
      // Consumers (ListenLaterButton, album badges) read saved-state off the
      // album object's original URI, which the server round-trip doesn't mutate
      // — dropping it would flip the icon back to "unsaved" and make a second
      // click re-add instead of remove. remove() resolves a non-library URI to
      // its server row via the lookup fallback below, so both keys clear fine.
      if (persisted?.uri && persisted.uri !== originalUri) {
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
    // Decide add-vs-remove off the same saved-state the icon shows (isSaved trusts
    // the server flag and the cache), not the cache alone — otherwise an already-saved
    // album whose URI was never primed into the cache would be re-added instead of
    // removed on the first click.
    if (isSaved(album)) {
      await remove(album);
      return false;
    }
    await add(album);
    return true;
  };

  return { isSaved, prime, toggle, add, remove };
}
