<script setup lang="ts">
import { computed, watch } from "vue";
import { BookmarkCheck, BookmarkPlus } from "@lucide/vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import type { Album } from "@/plugins/api/interfaces";
import { useListenLater } from "@/composables/useListenLater";

interface Props {
  album: Album;
  size?: number;
}
const props = withDefaults(defineProps<Props>(), {
  size: 24,
});

const { isSaved, toggle, prime } = useListenLater();
const { t } = useI18n();

// Album payload from the server is authoritative; cache covers optimistic
// flips so the icon updates instantly on click.
const saved = computed(() => isSaved(props.album));

const tooltip = computed(() =>
  saved.value ? t("listen_later.remove") : t("listen_later.add"),
);

// Prime the cache whenever the album changes so first-click stays consistent
// with the server-known state. A watcher (not a one-shot setup call) is required
// because this component instance is reused across album→album navigation
// (the router-view and AlbumDetails are not re-keyed).
watch(() => props.album, prime, { immediate: true });

async function onClick(e: MouseEvent) {
  e.stopPropagation();
  e.preventDefault();
  try {
    const nowSaved = await toggle(props.album);
    toast.success(
      nowSaved
        ? t("listen_later.toast_added")
        : t("listen_later.toast_removed"),
    );
  } catch (err) {
    console.error(err);
    toast.error(t("listen_later.toast_toggle_failed"));
  }
}
</script>

<template>
  <button
    type="button"
    class="listen-later-btn"
    :class="{ 'is-saved': saved }"
    :title="tooltip"
    :aria-pressed="saved"
    :aria-label="tooltip"
    @click="onClick"
  >
    <BookmarkCheck v-if="saved" :size="size" :stroke-width="2" />
    <BookmarkPlus v-else :size="size" :stroke-width="2" />
  </button>
</template>

<style scoped>
.listen-later-btn {
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: inherit;
  line-height: 0;
  transition:
    transform 120ms ease,
    color 120ms ease;
}

.listen-later-btn:hover {
  transform: translateY(-1px);
}

/* The "saved" state uses a warm amber so it reads as a positive personal flag
 * without competing with the heart's red. */
.listen-later-btn.is-saved {
  color: rgb(250 204 21);
}

.listen-later-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
