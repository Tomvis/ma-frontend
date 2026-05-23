<!--
  Unified review-filters panel.

  Replaces three separate context-menu filter items (DR / AMG / TPS) with one
  dialog that groups all critical-reception filters under a single, structured
  surface. Inside, each source carries its own color identity (rose for AMG,
  sky for TPS, chromatic tiers for DR), matching the badge language used in
  AlbumListBadges / AlbumPanelBadges / CriticalReception so the controls feel
  like the input form of those displays.

  Reads from the same `params` object ItemsListing already mutates and routes
  every change through the same `toggleList` / `toggleBool` callbacks so URL
  persistence, per-listing preferences and reload behavior are unchanged.
-->
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="520"
    :scrim="true"
    transition="fade-transition"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card class="rf-panel" rounded="lg">
      <!-- Eyebrow row: small mono label · active count · clear-all -->
      <header class="rf-eyebrow">
        <span class="rf-eyebrow__title">
          <span class="rf-eyebrow__dot" aria-hidden="true"></span>
          {{ $t("review_filters.eyebrow") }}
        </span>
        <span class="rf-eyebrow__spacer"></span>
        <span v-if="activeCount > 0" class="rf-eyebrow__count">
          {{ $t("review_filters.n_active", [activeCount]) }}
        </span>
        <button
          v-if="activeCount > 0"
          type="button"
          class="rf-eyebrow__clear"
          @click="onClearAll"
        >
          {{ $t("review_filters.clear_all") }}
        </button>
        <button
          type="button"
          class="rf-eyebrow__close"
          :aria-label="$t('close')"
          @click="emit('update:modelValue', false)"
        >
          <v-icon icon="mdi-close" size="18" />
        </button>
      </header>

      <!-- Match-mode row: ALL/ANY toggle controls how the clauses below combine.
           When ANY is active a colored hint sits underneath the pill so the
           broader semantic is visible from outside the panel too. -->
      <div class="rf-match" :data-mode="matchMode">
        <span class="rf-match__label">
          <v-icon
            :icon="matchMode === 'any' ? 'mdi-set-merge' : 'mdi-set-center'"
            size="14"
            class="rf-match__glyph"
          />
          {{ $t("review_filters.match.label") }}
        </span>
        <div
          class="rf-match__toggle"
          role="radiogroup"
          :aria-label="$t('review_filters.match.label')"
        >
          <span
            class="rf-match__slider"
            :class="{ 'rf-match__slider--right': matchMode === 'any' }"
            aria-hidden="true"
          ></span>
          <button
            type="button"
            role="radio"
            class="rf-match__opt"
            :class="{ 'rf-match__opt--active': matchMode === 'all' }"
            :aria-checked="matchMode === 'all'"
            :title="$t('review_filters.match.all_hint')"
            @click="onSetMatch('all')"
          >
            {{ $t("review_filters.match.all") }}
          </button>
          <button
            type="button"
            role="radio"
            class="rf-match__opt"
            :class="{ 'rf-match__opt--active': matchMode === 'any' }"
            :aria-checked="matchMode === 'any'"
            :title="$t('review_filters.match.any_hint')"
            @click="onSetMatch('any')"
          >
            {{ $t("review_filters.match.any") }}
          </button>
        </div>
        <span class="rf-match__hint">
          <template v-if="matchMode === 'any'">
            {{ $t("review_filters.match.any_hint") }}
          </template>
          <template v-else>
            {{ $t("review_filters.match.all_hint") }}
          </template>
        </span>
      </div>

      <!-- ── DR · Dynamic Range ──────────────────────────────────── -->
      <section v-if="showDr" class="rf-section rf-section--dr">
        <h3 class="rf-heading">
          <span class="rf-heading__tag">DR</span>
          <span class="rf-heading__name">{{
            $t("critical_reception.dynamic_range")
          }}</span>
          <span
            v-if="drActiveCount > 0"
            class="rf-heading__count"
            data-accent="dr"
          >
            {{ drActiveCount }}
          </span>
        </h3>

        <!-- 4-tile spectrum: each tile shows numeric range + verdict word -->
        <div class="rf-spectrum" role="group">
          <button
            v-for="bucket in DR_BUCKETS"
            :key="bucket.id"
            type="button"
            class="rf-tile"
            :class="{ 'rf-tile--active': isDrActive(bucket.id) }"
            :data-quality="bucket.id"
            :title="$t(`critical_reception.dr_quality.${bucket.id}`)"
            @click="$emit('toggleList', 'drBuckets', bucket.id)"
          >
            <span class="rf-tile__range">{{ bucket.range }}</span>
            <span class="rf-tile__label">{{
              $t(`critical_reception.dr_quality.${bucket.id}`)
            }}</span>
            <span class="rf-tile__bar" aria-hidden="true">
              <span
                v-for="n in 4"
                :key="n"
                class="rf-tile__notch"
                :class="{ 'rf-tile__notch--lit': n <= bucket.level }"
              ></span>
            </span>
          </button>
        </div>

        <!-- footer: untagged toggle on its own -->
        <div class="rf-footer">
          <button
            type="button"
            class="rf-mini"
            :class="{ 'rf-mini--active': isDrActive('untagged') }"
            @click="$emit('toggleList', 'drBuckets', 'untagged')"
          >
            <v-icon
              :icon="
                isDrActive('untagged')
                  ? 'mdi-checkbox-marked-outline'
                  : 'mdi-checkbox-blank-outline'
              "
              size="14"
            />
            <span>{{ $t("critical_reception.untagged") }}</span>
          </button>
        </div>
      </section>

      <v-divider v-if="showDr && (showAmg || showTps)" class="rf-divider" />

      <!-- ── AMG · Angry Metal Guy (rose, /5 ratings) ───────────── -->
      <section v-if="showAmg" class="rf-section rf-section--amg">
        <h3 class="rf-heading">
          <span class="rf-heading__tag" data-accent="amg">AMG</span>
          <span class="rf-heading__name">{{ $t("source.amg") }}</span>
          <span
            v-if="amgActiveCount > 0"
            class="rf-heading__count"
            data-accent="amg"
          >
            {{ amgActiveCount }}
          </span>
        </h3>

        <!-- rating row: 5 star-pill toggles -->
        <div class="rf-row">
          <span class="rf-row__label">{{ $t("review_filters.rating") }}</span>
          <div class="rf-stars" role="group">
            <button
              v-for="n in [1, 2, 3, 4, 5]"
              :key="`amg-r-${n}`"
              type="button"
              class="rf-star"
              data-accent="amg"
              :class="{ 'rf-star--active': isAmgRatingActive(n) }"
              :title="`${'★'.repeat(n)}${'☆'.repeat(5 - n)}`"
              @click="$emit('toggleList', 'amgRatings', n)"
            >
              <span
                v-for="i in 5"
                :key="`s-${i}`"
                class="rf-star__pip"
                :class="{ 'rf-star__pip--lit': i <= n }"
                >★</span
              >
            </button>
          </div>
        </div>

        <!-- accolades row -->
        <div class="rf-row">
          <span class="rf-row__label">{{
            $t("review_filters.accolades")
          }}</span>
          <div class="rf-chips" role="group">
            <button
              v-for="label in ACCOLADE_LABELS"
              :key="`amg-l-${label}`"
              type="button"
              class="rf-chip"
              data-accent="amg"
              :class="{ 'rf-chip--active': isAmgLabelActive(label) }"
              :title="$t(`critical_reception.label_kind.${label}`)"
              @click="$emit('toggleList', 'amgLabels', label)"
            >
              {{ $t(`review_filters.label_short.${label}`) }}
            </button>
          </div>
        </div>

        <!-- footer: pick + untagged -->
        <div class="rf-footer">
          <button
            type="button"
            class="rf-mini"
            data-accent="amg"
            :class="{ 'rf-mini--active': !!params.amgFavorite }"
            @click="$emit('toggleBool', 'amgFavorite')"
          >
            <v-icon icon="mdi-sparkles" size="14" />
            <span>{{ $t("critical_reception.favorite_pick") }}</span>
          </button>
          <button
            type="button"
            class="rf-mini"
            :class="{ 'rf-mini--active': !!params.amgUntagged }"
            @click="$emit('toggleBool', 'amgUntagged')"
          >
            <v-icon
              :icon="
                params.amgUntagged
                  ? 'mdi-checkbox-marked-outline'
                  : 'mdi-checkbox-blank-outline'
              "
              size="14"
            />
            <span>{{ $t("critical_reception.untagged") }}</span>
          </button>
        </div>
      </section>

      <v-divider v-if="showAmg && showTps" class="rf-divider" />

      <!-- ── TPS · The Progressive Subway (sky, /10 bands) ──────── -->
      <section v-if="showTps" class="rf-section rf-section--tps">
        <h3 class="rf-heading">
          <span class="rf-heading__tag" data-accent="tps">TPS</span>
          <span class="rf-heading__name">{{ $t("source.tps") }}</span>
          <span
            v-if="tpsActiveCount > 0"
            class="rf-heading__count"
            data-accent="tps"
          >
            {{ tpsActiveCount }}
          </span>
        </h3>

        <!-- rating row: 5 band toggles, /10 grouped in pairs -->
        <div class="rf-row">
          <span class="rf-row__label">{{ $t("review_filters.rating") }}</span>
          <div class="rf-bands" role="group">
            <button
              v-for="band in TPS_BANDS"
              :key="`tps-r-${band.lo}`"
              type="button"
              class="rf-band"
              data-accent="tps"
              :class="{ 'rf-band--active': isTpsRatingActive(band.lo) }"
              @click="$emit('toggleList', 'tpsRatings', band.lo)"
            >
              <span class="rf-band__nums">{{ band.lo }}–{{ band.hi }}</span>
              <span class="rf-band__rail" aria-hidden="true">
                <span
                  class="rf-band__fill"
                  :style="{ width: `${(band.hi / 10) * 100}%` }"
                ></span>
              </span>
            </button>
          </div>
        </div>

        <!-- accolades row -->
        <div class="rf-row">
          <span class="rf-row__label">{{
            $t("review_filters.accolades")
          }}</span>
          <div class="rf-chips" role="group">
            <button
              v-for="label in ACCOLADE_LABELS"
              :key="`tps-l-${label}`"
              type="button"
              class="rf-chip"
              data-accent="tps"
              :class="{ 'rf-chip--active': isTpsLabelActive(label) }"
              :title="$t(`critical_reception.label_kind.${label}`)"
              @click="$emit('toggleList', 'tpsLabels', label)"
            >
              {{ $t(`review_filters.label_short.${label}`) }}
            </button>
          </div>
        </div>

        <!-- footer: pick + untagged -->
        <div class="rf-footer">
          <button
            type="button"
            class="rf-mini"
            data-accent="tps"
            :class="{ 'rf-mini--active': !!params.tpsFavorite }"
            @click="$emit('toggleBool', 'tpsFavorite')"
          >
            <v-icon icon="mdi-sparkles" size="14" />
            <span>{{ $t("critical_reception.favorite_pick") }}</span>
          </button>
          <button
            type="button"
            class="rf-mini"
            :class="{ 'rf-mini--active': !!params.tpsUntagged }"
            @click="$emit('toggleBool', 'tpsUntagged')"
          >
            <v-icon
              :icon="
                params.tpsUntagged
                  ? 'mdi-checkbox-marked-outline'
                  : 'mdi-checkbox-blank-outline'
              "
              size="14"
            />
            <span>{{ $t("critical_reception.untagged") }}</span>
          </button>
        </div>
      </section>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

type DrBucket = "excellent" | "good" | "fair" | "poor" | "untagged";
type AccoladeLabel =
  | "aoty"
  | "record_of_the_month"
  | "aotm"
  | "honorable_mention";

// Mirrors LoadDataParams' critical-reception slice.
export interface ReviewFiltersParams {
  drBuckets?: DrBucket[];
  amgRatings?: number[];
  amgFavorite?: boolean;
  amgLabels?: string[];
  amgUntagged?: boolean;
  tpsRatings?: number[];
  tpsFavorite?: boolean;
  tpsLabels?: string[];
  tpsUntagged?: boolean;
  criticalReceptionMatch?: "all" | "any";
}

interface Props {
  modelValue: boolean;
  params: ReviewFiltersParams;
  showDr?: boolean;
  showAmg?: boolean;
  showTps?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDr: false,
  showAmg: false,
  showTps: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (
    e: "toggleList",
    key: "drBuckets" | "amgRatings" | "amgLabels" | "tpsRatings" | "tpsLabels",
    value: string | number,
  ): void;
  (
    e: "toggleBool",
    key: "amgFavorite" | "amgUntagged" | "tpsFavorite" | "tpsUntagged",
  ): void;
  (e: "setMatchMode", mode: "all" | "any"): void;
  (e: "clearAll"): void;
}>();

// Current AND/OR mode. Default is "all" (AND) — matches today's behavior so
// existing saved listings don't silently change semantics on upgrade.
const matchMode = computed<"all" | "any">(() =>
  props.params.criticalReceptionMatch === "any" ? "any" : "all",
);
const onSetMatch = (mode: "all" | "any") => {
  if (matchMode.value !== mode) emit("setMatchMode", mode);
};

// DR tiers carry both their numeric threshold range (the actual filter shape)
// and a 1–4 "level" used to drive the four-notch indicator on each tile.
// Sourced from DR_THRESHOLDS in helpers/album_tags.ts to keep the two in sync.
const DR_BUCKETS: Array<{
  id: Exclude<DrBucket, "untagged">;
  range: string;
  level: 1 | 2 | 3 | 4;
}> = [
  { id: "excellent", range: "≥ 14", level: 4 },
  { id: "good", range: "10 – 13", level: 3 },
  { id: "fair", range: "7 – 9", level: 2 },
  { id: "poor", range: "≤ 6", level: 1 },
];

// TPS ratings are stored as bucket selectors (1, 3, 5, 7, 9 — each covers
// a band of 2 on /10). Order reversed so highest sits leftmost, matching DR.
const TPS_BANDS: Array<{ lo: number; hi: number }> = [
  { lo: 9, hi: 10 },
  { lo: 7, hi: 8 },
  { lo: 5, hi: 6 },
  { lo: 3, hi: 4 },
  { lo: 1, hi: 2 },
];

const ACCOLADE_LABELS: AccoladeLabel[] = [
  "aoty",
  "record_of_the_month",
  "aotm",
  "honorable_mention",
];

const isDrActive = (b: DrBucket) => (props.params.drBuckets ?? []).includes(b);
const isAmgRatingActive = (n: number) =>
  (props.params.amgRatings ?? []).includes(n);
const isAmgLabelActive = (l: AccoladeLabel) =>
  (props.params.amgLabels ?? []).includes(l);
const isTpsRatingActive = (n: number) =>
  (props.params.tpsRatings ?? []).includes(n);
const isTpsLabelActive = (l: AccoladeLabel) =>
  (props.params.tpsLabels ?? []).includes(l);

const drActiveCount = computed(() => (props.params.drBuckets ?? []).length);
const amgActiveCount = computed(
  () =>
    (props.params.amgRatings ?? []).length +
    (props.params.amgLabels ?? []).length +
    (props.params.amgFavorite ? 1 : 0) +
    (props.params.amgUntagged ? 1 : 0),
);
const tpsActiveCount = computed(
  () =>
    (props.params.tpsRatings ?? []).length +
    (props.params.tpsLabels ?? []).length +
    (props.params.tpsFavorite ? 1 : 0) +
    (props.params.tpsUntagged ? 1 : 0),
);
const activeCount = computed(
  () => drActiveCount.value + amgActiveCount.value + tpsActiveCount.value,
);

const onClearAll = () => emit("clearAll");
</script>

<style scoped>
/* ── Panel shell ───────────────────────────────────────────────── */
.rf-panel {
  /* Surface picks up Vuetify's theme panel color (#ffffff / #232323) so the
   * dialog reads as part of the toolbar surface rather than a generic modal. */
  background: rgb(var(--v-theme-panel));
  color: rgb(var(--v-theme-fg));
  padding: 18px 20px 20px;
  overflow: hidden;
}

/* ── Eyebrow row ───────────────────────────────────────────────── */
.rf-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  padding-bottom: 12px;
}

.rf-eyebrow__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.7;
}

.rf-eyebrow__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(
    135deg,
    rgb(244 63 94) 0%,
    rgb(244 63 94) 49%,
    rgb(56 189 248) 51%,
    rgb(56 189 248) 100%
  );
}

.rf-eyebrow__spacer {
  flex: 1;
}

.rf-eyebrow__count {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
}

.rf-eyebrow__clear {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: currentColor;
  opacity: 0.75;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition:
    opacity 120ms ease,
    background 120ms ease;
}
.rf-eyebrow__clear:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.rf-eyebrow__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: currentColor;
  opacity: 0.55;
  transition:
    opacity 120ms ease,
    background 120ms ease;
}
.rf-eyebrow__close:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 8%, transparent);
}

/* ── Match-mode row (ALL / ANY toggle) ─────────────────────────── */
.rf-match {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 14px;
  row-gap: 4px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: color-mix(in srgb, currentColor 3.5%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 9%, transparent);
  transition:
    background 200ms ease,
    border-color 200ms ease;
}

/* ANY mode = subtle amber lift so the broader semantic registers immediately. */
.rf-match[data-mode="any"] {
  background: rgb(245 158 11 / 0.06);
  border-color: rgb(245 158 11 / 0.32);
}

.rf-match__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.75;
}

.rf-match__glyph {
  opacity: 0.7;
}

.rf-match[data-mode="any"] .rf-match__glyph {
  color: rgb(245 158 11);
  opacity: 1;
}

/* Two-segment toggle with a sliding indicator behind the active option.
 * Position the slider absolutely so its translateX animation creates the
 * "pill snaps to the chosen side" motion. */
.rf-match__toggle {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  justify-self: end;
  width: 130px;
  height: 28px;
  padding: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 8%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
}

.rf-match__slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
  transition:
    transform 220ms cubic-bezier(0.25, 1.4, 0.5, 1),
    background 200ms ease;
  pointer-events: none;
}
.rf-match__slider--right {
  transform: translateX(100%);
  background: rgb(245 158 11 / 0.85);
}

.rf-match__opt {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: currentColor;
  opacity: 0.5;
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    opacity 160ms ease,
    color 160ms ease;
}
.rf-match__opt:hover {
  opacity: 0.85;
}
.rf-match__opt--active {
  opacity: 1;
}
.rf-match[data-mode="any"] .rf-match__opt--active {
  color: #fff;
  text-shadow: 0 0 1px rgb(0 0 0 / 0.25);
}

/* Caption spans the full row's content cells (just under the label & toggle),
 * staying short. Italic for the "rule of thumb" feel. */
.rf-match__hint {
  grid-column: 1 / -1;
  font-size: 11px;
  letter-spacing: 0.005em;
  font-style: italic;
  opacity: 0.55;
  line-height: 1.35;
}
.rf-match[data-mode="any"] .rf-match__hint {
  color: rgb(180 83 9);
  opacity: 0.85;
  font-style: normal;
}
:deep(.v-theme--dark) .rf-match[data-mode="any"] .rf-match__hint,
.v-theme--dark .rf-match[data-mode="any"] .rf-match__hint {
  color: rgb(252 211 77);
}

/* ── Section / heading ─────────────────────────────────────────── */
.rf-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 14px;
}
.rf-section:last-child {
  padding-bottom: 2px;
}

.rf-divider {
  opacity: 0.18;
  margin: 4px 0;
}

.rf-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
}

.rf-heading__tag {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 3px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
}
.rf-heading__tag[data-accent="amg"] {
  color: rgb(244 63 94);
  background: rgb(244 63 94 / 0.1);
  border-color: rgb(244 63 94 / 0.4);
}
.rf-heading__tag[data-accent="tps"] {
  color: rgb(2 132 199);
  background: rgb(56 189 248 / 0.1);
  border-color: rgb(56 189 248 / 0.4);
}

.rf-heading__name {
  font-size: 13px;
  letter-spacing: 0.01em;
  font-weight: 500;
  opacity: 0.88;
}

.rf-heading__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
  margin-left: auto;
}
.rf-heading__count[data-accent="amg"] {
  background: rgb(244 63 94 / 0.16);
  color: rgb(244 63 94);
}
.rf-heading__count[data-accent="tps"] {
  background: rgb(56 189 248 / 0.18);
  color: rgb(2 132 199);
}

/* ── DR spectrum (4 tiles in a row) ───────────────────────────── */
.rf-spectrum {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.rf-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 10px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  background: transparent;
  color: currentColor;
  cursor: pointer;
  text-align: left;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    transform 140ms ease;
}
.rf-tile:hover {
  background: color-mix(in srgb, currentColor 4%, transparent);
}
.rf-tile:active {
  transform: translateY(1px);
}

.rf-tile__range {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.rf-tile__label {
  font-size: 10.5px;
  font-weight: 500;
  opacity: 0.6;
  letter-spacing: 0.02em;
  line-height: 1;
}

/* Quality-coded color per tier (matches the badge value coloring). */
.rf-tile[data-quality="excellent"] .rf-tile__range {
  color: rgb(34 197 94);
}
.rf-tile[data-quality="good"] .rf-tile__range {
  color: rgb(59 130 246);
}
.rf-tile[data-quality="fair"] .rf-tile__range {
  color: rgb(245 158 11);
}
.rf-tile[data-quality="poor"] .rf-tile__range {
  color: rgb(239 68 68);
}

/* Four-notch indicator bar at the bottom of each tile — visualizes the
 * tier's position on the dynamic-range axis without needing a legend. */
.rf-tile__bar {
  display: inline-flex;
  gap: 2px;
  margin-top: 2px;
}
.rf-tile__notch {
  width: 6px;
  height: 3px;
  border-radius: 1px;
  background: color-mix(in srgb, currentColor 14%, transparent);
}
.rf-tile[data-quality="excellent"] .rf-tile__notch--lit {
  background: rgb(34 197 94);
}
.rf-tile[data-quality="good"] .rf-tile__notch--lit {
  background: rgb(59 130 246);
}
.rf-tile[data-quality="fair"] .rf-tile__notch--lit {
  background: rgb(245 158 11);
}
.rf-tile[data-quality="poor"] .rf-tile__notch--lit {
  background: rgb(239 68 68);
}

/* Active state: tinted fill, prominent border in the quality color. */
.rf-tile--active[data-quality="excellent"] {
  background: rgb(34 197 94 / 0.1);
  border-color: rgb(34 197 94 / 0.55);
}
.rf-tile--active[data-quality="good"] {
  background: rgb(59 130 246 / 0.1);
  border-color: rgb(59 130 246 / 0.55);
}
.rf-tile--active[data-quality="fair"] {
  background: rgb(245 158 11 / 0.1);
  border-color: rgb(245 158 11 / 0.55);
}
.rf-tile--active[data-quality="poor"] {
  background: rgb(239 68 68 / 0.1);
  border-color: rgb(239 68 68 / 0.55);
}

/* ── Row layout for rating + accolades rows ────────────────────── */
.rf-row {
  display: grid;
  grid-template-columns: 78px 1fr;
  align-items: center;
  gap: 12px;
}

.rf-row__label {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.55;
}

/* ── AMG star pills (5 of them) ────────────────────────────────── */
.rf-stars {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.rf-star {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 5px 7px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  background: transparent;
  cursor: pointer;
  color: rgb(244 63 94 / 0.55);
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
  line-height: 1;
}
.rf-star:hover {
  background: rgb(244 63 94 / 0.06);
  border-color: rgb(244 63 94 / 0.3);
}
.rf-star__pip {
  font-size: 12px;
  color: color-mix(in srgb, currentColor 26%, transparent);
  letter-spacing: -0.06em;
}
.rf-star__pip--lit {
  color: rgb(244 63 94);
}
.rf-star--active {
  background: rgb(244 63 94 / 0.12);
  border-color: rgb(244 63 94 / 0.55);
}
.rf-star--active .rf-star__pip--lit {
  color: rgb(225 29 72);
}

/* ── TPS rating bands (5 of them, /10 grouped in pairs) ────────── */
.rf-bands {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.rf-band {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 42px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  background: transparent;
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease;
}
.rf-band:hover {
  background: rgb(56 189 248 / 0.06);
  border-color: rgb(56 189 248 / 0.3);
}
.rf-band__nums {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: rgb(2 132 199 / 0.8);
  line-height: 1;
}
.rf-band__rail {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  overflow: hidden;
}
.rf-band__fill {
  display: block;
  height: 100%;
  background: rgb(56 189 248 / 0.4);
  border-radius: inherit;
}
.rf-band--active {
  background: rgb(56 189 248 / 0.12);
  border-color: rgb(56 189 248 / 0.55);
}
.rf-band--active .rf-band__nums {
  color: rgb(2 132 199);
}
.rf-band--active .rf-band__fill {
  background: rgb(56 189 248 / 0.85);
}

/* ── Accolade chips (shared, accent driven by data-attr) ───────── */
.rf-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.rf-chip {
  font-family: "JetBrains Mono Medium", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 600;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  background: transparent;
  color: color-mix(in srgb, currentColor 70%, transparent);
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}
.rf-chip[data-accent="amg"]:hover {
  background: rgb(244 63 94 / 0.06);
  border-color: rgb(244 63 94 / 0.4);
  color: rgb(225 29 72);
}
.rf-chip[data-accent="tps"]:hover {
  background: rgb(56 189 248 / 0.06);
  border-color: rgb(56 189 248 / 0.4);
  color: rgb(2 132 199);
}
.rf-chip--active[data-accent="amg"] {
  background: rgb(244 63 94 / 0.14);
  border-color: rgb(244 63 94 / 0.55);
  color: rgb(225 29 72);
}
.rf-chip--active[data-accent="tps"] {
  background: rgb(56 189 248 / 0.16);
  border-color: rgb(56 189 248 / 0.55);
  color: rgb(2 132 199);
}

/* ── Footer mini-toggles (personal pick / untagged) ────────────── */
.rf-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}

.rf-mini {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  background: transparent;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  color: currentColor;
  opacity: 0.82;
  transition:
    background 140ms ease,
    opacity 140ms ease,
    border-color 140ms ease;
}
.rf-mini:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 5%, transparent);
}
.rf-mini--active {
  opacity: 1;
  background: color-mix(in srgb, currentColor 8%, transparent);
  border-color: color-mix(in srgb, currentColor 35%, transparent);
}
.rf-mini--active[data-accent="amg"] {
  background: rgb(245 158 11 / 0.12);
  border-color: rgb(245 158 11 / 0.4);
  color: rgb(245 158 11);
}
.rf-mini--active[data-accent="tps"] {
  background: rgb(245 158 11 / 0.12);
  border-color: rgb(245 158 11 / 0.4);
  color: rgb(245 158 11);
}

/* Dark-theme lifts for source colors (matches AlbumListBadges pattern). */
:deep(.v-theme--dark) .rf-heading__tag[data-accent="amg"],
.v-theme--dark .rf-heading__tag[data-accent="amg"] {
  color: rgb(251 113 133);
  background: rgb(244 63 94 / 0.14);
  border-color: rgb(244 63 94 / 0.45);
}
:deep(.v-theme--dark) .rf-heading__tag[data-accent="tps"],
.v-theme--dark .rf-heading__tag[data-accent="tps"] {
  color: rgb(125 211 252);
  background: rgb(56 189 248 / 0.14);
  border-color: rgb(56 189 248 / 0.45);
}
:deep(.v-theme--dark) .rf-heading__count[data-accent="amg"],
.v-theme--dark .rf-heading__count[data-accent="amg"] {
  color: rgb(251 113 133);
  background: rgb(244 63 94 / 0.2);
}
:deep(.v-theme--dark) .rf-heading__count[data-accent="tps"],
.v-theme--dark .rf-heading__count[data-accent="tps"] {
  color: rgb(125 211 252);
  background: rgb(56 189 248 / 0.22);
}
:deep(.v-theme--dark) .rf-star,
.v-theme--dark .rf-star {
  color: rgb(251 113 133 / 0.55);
}
:deep(.v-theme--dark) .rf-star__pip--lit,
.v-theme--dark .rf-star__pip--lit {
  color: rgb(251 113 133);
}
:deep(.v-theme--dark) .rf-star--active .rf-star__pip--lit,
.v-theme--dark .rf-star--active .rf-star__pip--lit {
  color: rgb(253 164 175);
}
:deep(.v-theme--dark) .rf-band__nums,
.v-theme--dark .rf-band__nums {
  color: rgb(125 211 252 / 0.78);
}
:deep(.v-theme--dark) .rf-band--active .rf-band__nums,
.v-theme--dark .rf-band--active .rf-band__nums {
  color: rgb(125 211 252);
}
:deep(.v-theme--dark) .rf-chip[data-accent="amg"]:hover,
.v-theme--dark .rf-chip[data-accent="amg"]:hover {
  color: rgb(251 113 133);
}
:deep(.v-theme--dark) .rf-chip[data-accent="tps"]:hover,
.v-theme--dark .rf-chip[data-accent="tps"]:hover {
  color: rgb(125 211 252);
}
:deep(.v-theme--dark) .rf-chip--active[data-accent="amg"],
.v-theme--dark .rf-chip--active[data-accent="amg"] {
  color: rgb(251 113 133);
}
:deep(.v-theme--dark) .rf-chip--active[data-accent="tps"],
.v-theme--dark .rf-chip--active[data-accent="tps"] {
  color: rgb(125 211 252);
}
:deep(.v-theme--dark) .rf-mini--active[data-accent="amg"],
:deep(.v-theme--dark) .rf-mini--active[data-accent="tps"],
.v-theme--dark .rf-mini--active[data-accent="amg"],
.v-theme--dark .rf-mini--active[data-accent="tps"] {
  color: rgb(250 204 21);
  background: rgb(250 204 21 / 0.14);
  border-color: rgb(250 204 21 / 0.45);
}

/* ── Mobile shrink ─────────────────────────────────────────────── */
@media (max-width: 540px) {
  .rf-panel {
    padding: 14px 14px 16px;
  }
  .rf-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .rf-row__label {
    margin-bottom: -2px;
  }
  .rf-spectrum {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
