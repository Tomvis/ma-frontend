import { computed, type ComputedRef, type Ref } from "vue";
import type { Album } from "@/plugins/api/interfaces";
import { parseAlbumTags, type AlbumTags } from "@/helpers/album_tags";

export function useAlbumTags(
  albumRef: Ref<Album | undefined>,
): ComputedRef<AlbumTags> {
  return computed(() =>
    parseAlbumTags(
      albumRef.value?.metadata?.critical_reception,
      albumRef.value?.metadata?.dynamic_range,
    ),
  );
}
