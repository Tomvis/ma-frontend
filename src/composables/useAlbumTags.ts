import { computed, type ComputedRef, type Ref } from "vue";
import type { Album } from "@/plugins/api/interfaces";
import { parseAlbumTags, type AlbumTags } from "@/helpers/album_tags";
import { FIXTURE_FULL } from "@/helpers/album_tags.fixture";

// Preview toggle: when `?cr-preview=1` is in the URL OR
// `localStorage.cr_preview === "1"`, fall back to the fixture for any album
// that doesn't yet have real `critical_reception` data. Lets the design be
// reviewed before the backend wires up the real field.
function previewEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("cr-preview=1")) return true;
  if (window.location.hash.includes("cr-preview=1")) return true;
  try {
    return window.localStorage.getItem("cr_preview") === "1";
  } catch {
    return false;
  }
}

export function useAlbumTags(
  albumRef: Ref<Album | undefined>,
): ComputedRef<AlbumTags> {
  return computed(() => {
    const real = albumRef.value?.metadata?.critical_reception;
    if (real) return parseAlbumTags(real);
    if (albumRef.value && previewEnabled()) {
      return parseAlbumTags(FIXTURE_FULL);
    }
    return parseAlbumTags(undefined);
  });
}
