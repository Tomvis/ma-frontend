<script setup lang="ts">
import { computed, toRef } from "vue";
import { Star, StarHalf, Sparkles } from "@lucide/vue";
import { useI18n } from "vue-i18n";
import type { Album, ReviewLink } from "@/plugins/api/interfaces";
import { useAlbumTags } from "@/composables/useAlbumTags";
import AccoladeChip from "@/components/album/AccoladeChip.vue";
import {
  formatScore,
  formatDr,
  type ParsedAccolade,
  type AuthorWithRole,
  type SourceTags,
} from "@/helpers/album_tags";

interface Props {
  album: Album;
}
const props = defineProps<Props>();
const albumRef = toRef(props, "album");
const tags = useAlbumTags(albumRef);
const { t } = useI18n();

const drVerdict = computed(() =>
  tags.value.dr
    ? t(`critical_reception.dr_quality.${tags.value.dr.quality}`)
    : "",
);

// Marker position on the 1–20 DR spectrum. The track underneath is segmented
// into the four quality regions, so the marker visually lands inside the
// matching tint without us needing to compute boundary widths in JS.
const drMeterPercent = computed(() =>
  tags.value.dr
    ? Math.max(0, Math.min(100, (tags.value.dr.value / 20) * 100))
    : 0,
);

function authorRoleTitle(author: AuthorWithRole): string {
  return t(`critical_reception.author_role.${author.role}`);
}

function sourceFullName(s: SourceTags): string {
  return s.source === "AMG" ? t("source.amg") : t("source.tps");
}

function ratingAria(s: SourceTags): string {
  if (s.rating === undefined) return sourceFullName(s);
  return t("critical_reception.stars_aria", {
    score: formatScore(s.rating),
    max: s.scale,
  });
}

// Bindings for the review-score element: when the source has a canonical "Review"
// post the score renders as a real <a> (link attrs below); otherwise the empty
// object leaves it an inert <span>. Resolved once per source via the computeds
// below so the link lookup isn't repeated across the element's bindings per render.
function reviewLinkAttrs(s: SourceTags | undefined): Record<string, string> {
  const href = s?.links.find((l) => l.label === "Review")?.url;
  return href
    ? {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "rs-numeric--link",
        title: t("critical_reception.open_review"),
      }
    : {};
}
// AMG and TPS render the same head / favorite-pick / accolade-chip / byline
// markup; only the accent and the rating widget (stars vs numeric+bar) differ.
// Drive both from one descriptor list so the shared markup lives once. accent is
// derived from the source name; the review-link attrs are resolved per source.
interface ReviewSourceDescriptor {
  src: SourceTags;
  accent: "amg" | "tps";
  reviewLink: Record<string, string>;
}
const reviewSources = computed<ReviewSourceDescriptor[]>(() =>
  [
    { src: tags.value.amg, accent: "amg" as const },
    { src: tags.value.tps, accent: "tps" as const },
  ]
    .filter((d): d is { src: SourceTags; accent: "amg" | "tps" } => !!d.src)
    .map((d) => ({ ...d, reviewLink: reviewLinkAttrs(d.src) })),
);

// The post links matching an accolade chip. Link labels mirror the stored accolade
// string; legacy-folded chips keep their raw token, so match either form. The chip
// (AccoladeChip) decides how to surface them: a direct link for one, a menu for many.
function linksForAccolade(s: SourceTags, a: ParsedAccolade): ReviewLink[] {
  return s.links.filter((l) => l.label === a.raw || l.label === a.display);
}
</script>

<template>
  <section
    v-if="tags.hasAny"
    class="reception-strip"
    :aria-label="$t('critical_reception.dynamic_range')"
  >
    <div class="rs-row">
      <!-- ── DR ────────────────────────────────────────────────────── -->
      <div
        v-if="tags.dr"
        class="rs-block rs-block--dr"
        :data-quality="tags.dr.quality"
        :data-source="tags.dr.source"
      >
        <div class="rs-head">
          <span
            class="rs-mark rs-mark--dr"
            :data-quality="tags.dr.quality"
            aria-hidden="true"
          ></span>
          <span class="rs-source-name">
            {{ $t("critical_reception.dynamic_range") }}
          </span>
          <!-- Dashed pill marks the AMG-fallback case (no measurement yet,
               so the value shown is review-reported rather than analyzed). -->
          <span
            v-if="tags.dr.source === 'amg'"
            class="rs-fallback-tag"
            :title="$t('critical_reception.amg_dr_fallback_hint')"
          >
            {{ $t("critical_reception.amg_dr") }}
          </span>
        </div>

        <div class="rs-main rs-main--dr">
          <span class="rs-dr-value" :data-quality="tags.dr.quality">
            {{ formatDr(tags.dr.value) }}
          </span>
          <div class="rs-dr-side">
            <div class="rs-dr-verdict" :data-quality="tags.dr.quality">
              {{ drVerdict }}
            </div>
            <div
              class="rs-meter"
              role="img"
              :aria-label="`DR ${formatDr(tags.dr.value)} of 20 — ${drVerdict}`"
            >
              <div
                class="rs-meter-marker"
                :data-quality="tags.dr.quality"
                :style="{ left: `${drMeterPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Divergence caption: surfaces AMG's reported DR when the rounded
             integer disagrees with the measurement. -->
        <div
          v-if="tags.amgDr"
          class="rs-caption rs-amg-divergence"
          :title="$t('critical_reception.amg_dr_divergence_hint')"
        >
          {{ $t("critical_reception.amg_dr") }}
          <strong>{{ formatDr(tags.amgDr.value) }}</strong>
        </div>
      </div>

      <!-- ── Review sources (AMG / TPS) ────────────────────────────── -->
      <template
        v-for="({ src, accent, reviewLink }, si) in reviewSources"
        :key="accent"
      >
        <span
          v-if="si > 0 || tags.dr"
          class="rs-divider"
          aria-hidden="true"
        ></span>

        <div class="rs-block rs-block--source" :data-accent="accent">
          <div class="rs-head">
            <span
              class="rs-mark"
              :data-accent="accent"
              aria-hidden="true"
            ></span>
            <span class="rs-source-name">{{ sourceFullName(src) }}</span>
          </div>

          <div class="rs-main">
            <template v-if="src.rating !== undefined">
              <!-- AMG: star rating then the numeric score. -->
              <template v-if="accent === 'amg'">
                <div class="rs-stars" role="img" :aria-label="ratingAria(src)">
                  <template v-for="i in 5" :key="i">
                    <Star
                      v-if="src.rating >= i"
                      :size="17"
                      class="fill-current"
                      aria-hidden="true"
                    />
                    <StarHalf
                      v-else-if="src.rating >= i - 0.5"
                      :size="17"
                      class="fill-current"
                      aria-hidden="true"
                    />
                    <Star
                      v-else
                      :size="17"
                      class="rs-stars__empty"
                      aria-hidden="true"
                    />
                  </template>
                </div>
                <component
                  :is="reviewLink.href ? 'a' : 'span'"
                  v-bind="reviewLink"
                  class="rs-numeric rs-numeric--amg"
                >
                  {{ formatScore(src.rating)
                  }}<span class="rs-scale"> / 5</span>
                </component>
              </template>
              <!-- TPS: numeric score then a fill bar. -->
              <template v-else>
                <component
                  :is="reviewLink.href ? 'a' : 'span'"
                  v-bind="reviewLink"
                  class="rs-numeric rs-numeric--tps"
                >
                  {{ formatScore(src.rating)
                  }}<span class="rs-scale"> / {{ src.scale }}</span>
                </component>
                <div class="rs-bar" role="img" :aria-label="ratingAria(src)">
                  <div
                    class="rs-bar-fill"
                    :style="{
                      width: `${(src.rating / src.scale) * 100}%`,
                    }"
                  ></div>
                </div>
              </template>
            </template>
            <template v-else-if="src.favorite">
              <div class="rs-favorite">
                <Sparkles :size="14" aria-hidden="true" />
                <span>{{ $t("critical_reception.favorite_pick") }}</span>
              </div>
            </template>
          </div>

          <div v-if="src.accolades.length" class="rs-chips">
            <AccoladeChip
              v-for="accolade in src.accolades"
              :key="`${accent}-acc-${accolade.raw}`"
              :accolade="accolade"
              :links="linksForAccolade(src, accolade)"
              :accent="accent"
            />
          </div>

          <div v-if="src.authors.length" class="rs-caption rs-byline">
            <span class="rs-em" aria-hidden="true">—</span>
            <template
              v-for="(author, ai) in src.authors"
              :key="`${accent}-a-${author.name}-${ai}`"
            >
              <span class="rs-author" :title="authorRoleTitle(author)">{{
                author.name
              }}</span>
              <span v-if="ai < src.authors.length - 1">, </span>
            </template>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────
   Inline editorial reception strip — bridges the dim InfoHeader and the
   borderless Tracks list. Deliberately avoids card chrome (no boxes, no
   left-accent stripes, no filled saturated badges) so it reads as an
   extension of the album header rather than a parallel dashboard widget.
   ───────────────────────────────────────────────────────────────────── */
.reception-strip {
  position: relative;
  margin: 6px 0 4px;
  padding: 14px 14px 12px;
}

/* Faded hairlines top and bottom turn the strip into a band without
 * making it look like a bordered card. */
.reception-strip::before,
.reception-strip::after {
  content: "";
  position: absolute;
  left: 6%;
  right: 6%;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--border, #e5e7eb) 90%, transparent) 50%,
    transparent 100%
  );
}
.reception-strip::before {
  top: 0;
}
.reception-strip::after {
  bottom: 0;
}

.rs-row {
  display: flex;
  align-items: stretch;
  gap: 26px;
  flex-wrap: wrap;
}

/* Dashed vertical seam between blocks. Drawn as a repeating gradient so
 * it never registers as a hard border. */
.rs-divider {
  width: 1px;
  align-self: stretch;
  flex-shrink: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    color-mix(in srgb, var(--muted-foreground, #64748b) 32%, transparent) 0 4px,
    transparent 4px 8px
  );
}

@media (max-width: 760px) {
  .rs-divider {
    width: 100%;
    height: 1px;
    background-image: repeating-linear-gradient(
      to right,
      color-mix(in srgb, var(--muted-foreground, #64748b) 28%, transparent) 0
        4px,
      transparent 4px 8px
    );
  }
}

/* ── Block layout ──────────────────────────────────────────────────── */
.rs-block {
  flex: 1 1 220px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rs-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rs-mark {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.rs-mark[data-accent="amg"] {
  background: rgb(244 63 94 / 0.85);
}
.rs-mark[data-accent="tps"] {
  background: rgb(56 189 248 / 0.85);
}
.rs-mark--dr[data-quality="excellent"] {
  background: rgb(34 197 94 / 0.85);
}
.rs-mark--dr[data-quality="good"] {
  background: rgb(59 130 246 / 0.85);
}
.rs-mark--dr[data-quality="fair"] {
  background: rgb(234 179 8 / 0.85);
}
.rs-mark--dr[data-quality="poor"] {
  background: rgb(239 68 68 / 0.85);
}

/* Italic editorial source name — replaces the tracking-wide uppercase
 * label that read as a dashboard badge. */
.rs-source-name {
  font-style: italic;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.005em;
  color: color-mix(in srgb, var(--foreground, #111827) 78%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.rs-fallback-tag {
  margin-left: auto;
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 999px;
  border: 1px dashed rgb(244 63 94 / 0.5);
  color: rgb(244 63 94 / 0.85);
  white-space: nowrap;
}

.rs-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}
.rs-main--dr {
  align-items: stretch;
  gap: 14px;
}

.rs-caption {
  font-size: 11.5px;
  color: var(--muted-foreground, #64748b);
}

.rs-byline {
  font-style: italic;
}

.rs-em {
  margin-right: 4px;
  opacity: 0.55;
  font-style: normal;
}

.rs-author {
  font-style: normal;
  font-weight: 500;
  text-decoration: underline dotted;
  text-decoration-color: color-mix(
    in srgb,
    var(--muted-foreground, #64748b) 40%,
    transparent
  );
  text-underline-offset: 3px;
  cursor: help;
}

/* ── DR block ──────────────────────────────────────────────────────── */
.rs-dr-value {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 38px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.rs-dr-value[data-quality="excellent"] {
  color: rgb(22 163 74);
}
.rs-dr-value[data-quality="good"] {
  color: rgb(37 99 235);
}
.rs-dr-value[data-quality="fair"] {
  color: rgb(202 138 4);
}
.rs-dr-value[data-quality="poor"] {
  color: rgb(220 38 38);
}

.rs-dr-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.rs-dr-verdict {
  font-size: 12.5px;
  font-weight: 500;
  font-style: italic;
}
.rs-dr-verdict[data-quality="excellent"] {
  color: rgb(22 163 74);
}
.rs-dr-verdict[data-quality="good"] {
  color: rgb(37 99 235);
}
.rs-dr-verdict[data-quality="fair"] {
  color: rgb(202 138 4);
}
.rs-dr-verdict[data-quality="poor"] {
  color: rgb(220 38 38);
}

/* Segmented quality track with a tinted marker pinned at the value's
 * 1–20 position. Replaces the redundant "DR" caption next to the number. */
.rs-meter {
  position: relative;
  height: 5px;
  width: 100%;
  max-width: 170px;
  border-radius: 3px;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgb(220 38 38 / 0.22) 0% 35%,
    rgb(202 138 4 / 0.22) 35% 50%,
    rgb(59 130 246 / 0.22) 50% 70%,
    rgb(34 197 94 / 0.22) 70% 100%
  );
}

.rs-meter-marker {
  position: absolute;
  top: -2px;
  width: 3px;
  height: 9px;
  border-radius: 1px;
  transform: translateX(-50%);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.55);
}
.rs-meter-marker[data-quality="excellent"] {
  background: rgb(22 163 74);
}
.rs-meter-marker[data-quality="good"] {
  background: rgb(37 99 235);
}
.rs-meter-marker[data-quality="fair"] {
  background: rgb(202 138 4);
}
.rs-meter-marker[data-quality="poor"] {
  background: rgb(220 38 38);
}

.rs-amg-divergence {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(244 63 94 / 0.85);
  font-style: normal;
}
.rs-amg-divergence strong {
  font-weight: 700;
  margin-left: 2px;
}

/* ── Source blocks (AMG/TPS) ───────────────────────────────────────── */
.rs-numeric {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 32px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.rs-numeric--amg {
  color: rgb(244 63 94);
}
.rs-numeric--tps {
  color: rgb(2 132 199);
}

.rs-scale {
  font-size: 13px;
  font-weight: 500;
  color: var(--muted-foreground, #64748b);
  margin-left: 4px;
  letter-spacing: 0;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    sans-serif;
}

.rs-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  color: rgb(244 63 94);
}
.rs-stars__empty {
  color: rgb(244 63 94 / 0.18);
}

.rs-bar {
  height: 3px;
  flex: 1;
  max-width: 110px;
  border-radius: 2px;
  background: color-mix(
    in srgb,
    var(--muted-foreground, #94a3b8) 18%,
    transparent
  );
  overflow: hidden;
  align-self: center;
}
.rs-bar-fill {
  height: 100%;
  background: rgb(56 189 248 / 0.85);
}

.rs-favorite {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(245 158 11);
  font-size: 13.5px;
  font-weight: 500;
  font-style: italic;
}

/* Outlined laurel-style chips. Accolades carry a tinted accent fill at
 * very low alpha; types are quiet outline-only. */
.rs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

/* Clickable review score links out to the canonical "Review" post; inherits the
   numeric colour (no default link blue) with a subtle underline-on-hover. The
   accolade chips live in AccoladeChip.vue, which owns their styles. */
a.rs-numeric--link {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}
a.rs-numeric--link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}
a.rs-numeric--link:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 55%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 760px) {
  .rs-row {
    gap: 14px;
  }
  .rs-block {
    flex: 1 1 100%;
  }
  .rs-dr-value,
  .rs-numeric {
    font-size: 30px;
  }
  .rs-meter {
    max-width: 100%;
  }
}
</style>
