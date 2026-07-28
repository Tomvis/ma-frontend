<script setup lang="ts">
import { toRef } from "vue";
import { BookmarkCheck, Star } from "@lucide/vue";
import type { Album } from "@/plugins/api/interfaces";
import { useAlbumBadgeLabels } from "@/composables/useAlbumBadgeLabels";

interface Props {
  album: Album;
}
const props = defineProps<Props>();
const albumRef = toRef(props, "album");
const { tags, savedForLater, formatScore, drTitle, amgTitle, tpsTitle } =
  useAlbumBadgeLabels(albumRef);
</script>

<template>
  <div v-if="tags.hasAny || savedForLater" class="album-list-badges">
    <div
      v-if="savedForLater"
      class="chip chip--listen-later"
      :title="$t('listen_later.saved_short')"
      :aria-label="$t('listen_later.saved_short')"
      role="img"
    >
      <BookmarkCheck :size="11" class="fill-current" aria-hidden="true" />
    </div>
    <div
      v-if="tags.dr"
      class="chip chip--dr"
      :data-quality="tags.dr.quality"
      :data-source="tags.dr.source"
      :title="drTitle"
      :aria-label="drTitle"
      role="img"
    >
      <span class="chip__label">DR</span>
      <span class="chip__value">{{ tags.dr.value }}</span>
    </div>
    <div
      v-if="tags.amg"
      class="chip chip--amg"
      :title="amgTitle"
      :aria-label="`AMG: ${amgTitle}`"
      role="img"
    >
      <Star :size="10" class="fill-current" aria-hidden="true" />
      <span v-if="tags.amg.rating !== undefined" class="chip__value">{{
        formatScore(tags.amg.rating)
      }}</span>
    </div>
    <div
      v-if="tags.tps"
      class="chip chip--tps"
      :title="tpsTitle"
      :aria-label="`TPS: ${tpsTitle}`"
      role="img"
    >
      <Star
        v-if="tags.tps.rating === undefined"
        :size="10"
        class="fill-current"
        aria-hidden="true"
      />
      <span v-else class="chip__value">{{ formatScore(tags.tps.rating) }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Inline chip strip for list rows. Unlike the panel variant, these chips
 * land on the row's flat background — not over a colorful album cover —
 * so they use accent-on-transparent styling that adapts to both themes
 * rather than the translucent-dark stamp used over thumbnails. */
.album-list-badges {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
  margin-right: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  white-space: nowrap;
}

.chip__label {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.6;
  text-transform: uppercase;
}

.chip__value {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 12px;
}

/* DR — neutral chrome, colored value. The label gets a dashed underline
 * in the AMG-fallback case so the badge isn't claiming to be a measurement. */
.chip--dr {
  color: var(--foreground, #111827);
  border-color: color-mix(in srgb, var(--foreground, #111827) 18%, transparent);
  background: color-mix(in srgb, var(--foreground, #111827) 4%, transparent);
}
.chip--dr[data-source="amg"] .chip__label {
  text-decoration: underline dashed currentColor;
  text-underline-offset: 2px;
  opacity: 0.5;
}
.chip--dr[data-quality="excellent"] .chip__value {
  color: rgb(34 197 94);
}
.chip--dr[data-quality="good"] .chip__value {
  color: rgb(59 130 246);
}
.chip--dr[data-quality="fair"] .chip__value {
  color: rgb(245 158 11);
}
.chip--dr[data-quality="poor"] .chip__value {
  color: rgb(239 68 68);
}

/* AMG — rose */
.chip--amg {
  color: rgb(225 29 72);
  border-color: rgb(244 63 94 / 0.45);
  background: rgb(244 63 94 / 0.07);
}

/* TPS — sky */
.chip--tps {
  color: rgb(2 132 199);
  border-color: rgb(56 189 248 / 0.55);
  background: rgb(56 189 248 / 0.08);
}

/* Listen-later — amber bookmark dot, matches the on-cover marker hue */
.chip--listen-later {
  width: 22px;
  padding: 0;
  justify-content: center;
  color: rgb(217 119 6);
  border-color: rgb(250 204 21 / 0.55);
  background: rgb(250 204 21 / 0.1);
}

/* Dark theme — Vuetify sets `v-theme--dark` on the surface wrapper; we use
 * an ancestor selector (no :global) so the scoped-CSS compiler keeps it
 * intact. Lift the accent colors so they read against the darker rows. */
:deep(.v-theme--dark) .chip--amg,
.v-theme--dark .chip--amg {
  color: rgb(251 113 133);
}
:deep(.v-theme--dark) .chip--tps,
.v-theme--dark .chip--tps {
  color: rgb(125 211 252);
}
:deep(.v-theme--dark) .chip--listen-later,
.v-theme--dark .chip--listen-later {
  color: rgb(250 204 21);
}
:deep(.v-theme--dark) .chip--dr[data-quality="excellent"] .chip__value,
.v-theme--dark .chip--dr[data-quality="excellent"] .chip__value {
  color: rgb(74 222 128);
}
:deep(.v-theme--dark) .chip--dr[data-quality="good"] .chip__value,
.v-theme--dark .chip--dr[data-quality="good"] .chip__value {
  color: rgb(96 165 250);
}
:deep(.v-theme--dark) .chip--dr[data-quality="fair"] .chip__value,
.v-theme--dark .chip--dr[data-quality="fair"] .chip__value {
  color: rgb(250 204 21);
}
:deep(.v-theme--dark) .chip--dr[data-quality="poor"] .chip__value,
.v-theme--dark .chip--dr[data-quality="poor"] .chip__value {
  color: rgb(248 113 113);
}
</style>
