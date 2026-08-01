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
const {
  tags,
  savedForLater,
  formatScore,
  formatDr,
  drTitle,
  amgTitle,
  tpsTitle,
} = useAlbumBadgeLabels(albumRef);
</script>

<template>
  <div v-if="tags.hasAny || savedForLater" class="album-badges">
    <div
      v-if="tags.dr"
      class="badge dr-badge"
      :data-quality="tags.dr.quality"
      :data-source="tags.dr.source"
      :title="drTitle"
      :aria-label="drTitle"
      role="img"
    >
      <span class="badge-label">DR</span>
      <span class="badge-value">{{ formatDr(tags.dr.value) }}</span>
    </div>
    <!-- spacer keeps the source-badge stack aligned to the right
         even when there's no DR badge but we still want a corner marker -->
    <div v-else></div>
    <div class="badge-stack">
      <div
        v-if="savedForLater"
        class="badge listen-later-badge"
        :title="$t('listen_later.saved_short')"
        :aria-label="$t('listen_later.saved_short')"
        role="img"
      >
        <BookmarkCheck :size="10" class="fill-current" />
      </div>
      <div
        v-if="tags.amg"
        class="badge source-badge amg"
        :title="amgTitle"
        :aria-label="`AMG: ${amgTitle}`"
        role="img"
      >
        <Star :size="9" class="fill-current" />
        <span v-if="tags.amg.rating !== undefined" class="badge-value">{{
          formatScore(tags.amg.rating)
        }}</span>
      </div>
      <div
        v-if="tags.tps"
        class="badge source-badge tps"
        :title="tpsTitle"
        :aria-label="`TPS: ${tpsTitle}`"
        role="img"
      >
        <Star
          v-if="tags.tps.rating === undefined"
          :size="9"
          class="fill-current"
        />
        <span v-else class="badge-value">{{
          formatScore(tags.tps.rating)
        }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Badges sit on top of album art, so we use a single translucent-dark
 * background that reads cleanly over both light and dark covers — no
 * theme-conditional CSS needed (and avoids the Vue scoped-CSS compiler
 * mishandling :global(:not(...)) ancestor selectors). */
.album-badges {
  position: absolute;
  inset: 6px 6px auto 6px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  pointer-events: none;
  z-index: 2;
}

.badge-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.95);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  font-variant-numeric: tabular-nums;
  pointer-events: auto;
}

.badge-label {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 8.5px;
  letter-spacing: 0.08em;
  opacity: 0.65;
  text-transform: uppercase;
}

.badge-value {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
}

.dr-badge {
  padding-left: 5px;
}
/* Dashed underline marks the AMG-fallback case (no measured value yet, so the
 * number you see is AMG's review-reported DR rather than a real measurement). */
.dr-badge[data-source="amg"] .badge-label {
  text-decoration: underline dashed rgba(255, 255, 255, 0.45);
  text-underline-offset: 2px;
}
.dr-badge[data-quality="excellent"] .badge-value {
  color: rgb(74 222 128);
}
.dr-badge[data-quality="good"] .badge-value {
  color: rgb(96 165 250);
}
.dr-badge[data-quality="fair"] .badge-value {
  color: rgb(250 204 21);
}
.dr-badge[data-quality="poor"] .badge-value {
  color: rgb(248 113 113);
}

.source-badge {
  padding: 2px 6px 2px 5px;
}
.source-badge.amg {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(244, 63, 94, 0.55);
}
.source-badge.amg :deep(svg),
.source-badge.amg .badge-value {
  color: rgb(251 113 133);
}

.source-badge.tps {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(56, 189, 248, 0.55);
}
.source-badge.tps :deep(svg),
.source-badge.tps .badge-value {
  color: rgb(125 211 252);
}

/* Listen-Later corner marker — same warm amber as the toggle button so
 * the on-cover affordance and the off-cover button read as one concept. */
.listen-later-badge {
  padding: 3px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(250, 204, 21, 0.55);
}
.listen-later-badge :deep(svg) {
  color: rgb(250 204 21);
}
</style>
