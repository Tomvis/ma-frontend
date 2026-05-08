<script setup lang="ts">
import { computed } from "vue";
import { Star, StarHalf, Sparkles, Trophy } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  SourceTags,
  ParsedLabel,
  AuthorWithRole,
} from "@/helpers/album_tags";

interface Props {
  tags: SourceTags;
}
const props = defineProps<Props>();
const { t, te } = useI18n();

const accent = computed(() => (props.tags.source === "AMG" ? "amg" : "tps"));
const sourceName = computed(() =>
  props.tags.source === "AMG" ? t("source.amg") : t("source.tps"),
);

const ratingDisplay = computed(() => {
  if (props.tags.rating === undefined) return undefined;
  return t("critical_reception.score_with_max", {
    score: formatScore(props.tags.rating),
    max: props.tags.scale,
  });
});

const ratingAria = computed(() => {
  if (props.tags.rating === undefined) return undefined;
  return t("critical_reception.stars_aria", {
    score: formatScore(props.tags.rating),
    max: props.tags.scale,
  });
});

const fillPercent = computed(() => {
  if (props.tags.rating === undefined) return 0;
  return Math.max(
    0,
    Math.min(100, (props.tags.rating / props.tags.scale) * 100),
  );
});

function formatScore(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : `${n}`;
}

function typeLabel(kind: string): string {
  const key = `critical_reception.type.${kind}`;
  return te(key) ? t(key) : kind;
}

function labelDisplay(label: ParsedLabel): string {
  if (label.kind === "aoty" && label.year !== undefined) {
    return t("critical_reception.label.AOTY_year", { year: label.year });
  }
  if (
    label.kind === "aotm" &&
    label.year !== undefined &&
    label.month !== undefined
  ) {
    return t("critical_reception.label.AOTM_year_month", {
      year: label.year,
      month: String(label.month).padStart(2, "0"),
    });
  }
  if (label.kind === "honorable_mention" && label.year !== undefined) {
    return t("critical_reception.label.HONORABLE_MENTION_year", {
      year: label.year,
    });
  }
  const key = `critical_reception.label.${label.raw}`;
  return te(key) ? t(key) : label.raw;
}

function isAccolade(label: ParsedLabel): boolean {
  return (
    label.kind === "aoty" ||
    label.kind === "record_of_the_month" ||
    label.kind === "aotm" ||
    label.kind === "honorable_mention"
  );
}

function authorRoleTitle(author: AuthorWithRole): string {
  return t(`critical_reception.author_role.${author.role}`);
}
</script>

<template>
  <Card
    class="source-card flex flex-col gap-3 border-l-2 py-4"
    :data-accent="accent"
  >
    <CardContent class="flex flex-col gap-3 px-4">
      <header class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="source-mark" aria-hidden="true"></span>
          <span
            class="truncate text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground"
          >
            {{ sourceName }}
          </span>
        </div>
      </header>

      <!-- Score zone: stars (AMG /5), numeric+bar (TPS /10), or favorite -->
      <div v-if="tags.rating !== undefined" class="flex flex-col gap-2">
        <template v-if="tags.scale === 5">
          <div class="flex items-center gap-2">
            <div
              role="img"
              :aria-label="ratingAria"
              class="flex items-center gap-0.5 amg-stars"
            >
              <template v-for="i in 5" :key="i">
                <Star
                  v-if="tags.rating >= i"
                  :size="18"
                  class="fill-current"
                  aria-hidden="true"
                />
                <StarHalf
                  v-else-if="tags.rating >= i - 0.5"
                  :size="18"
                  class="fill-current"
                  aria-hidden="true"
                />
                <Star v-else :size="18" class="opacity-25" aria-hidden="true" />
              </template>
            </div>
            <span class="font-semibold text-sm tabular-nums">
              {{ ratingDisplay }}
            </span>
          </div>
        </template>
        <template v-else>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-4xl font-bold leading-none tabular-nums score-numeric"
            >
              {{ formatScore(tags.rating) }}
            </span>
            <span class="text-sm text-muted-foreground tabular-nums">
              / {{ tags.scale }}
            </span>
          </div>
          <div
            class="h-1 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            :aria-label="ratingAria"
          >
            <div
              class="score-fill h-full"
              :style="{ width: `${fillPercent}%` }"
            ></div>
          </div>
        </template>
      </div>
      <div
        v-else-if="tags.favorite"
        class="flex items-center gap-1.5 text-sm font-medium favorite-pick"
      >
        <Sparkles :size="16" aria-hidden="true" />
        <span>{{ $t("critical_reception.favorite_pick") }}</span>
      </div>

      <!-- Labels (accolades) -->
      <div v-if="tags.labels.length" class="flex flex-wrap gap-1.5">
        <Badge
          v-for="label in tags.labels"
          :key="label.raw"
          :variant="isAccolade(label) ? 'secondary' : 'outline'"
          class="accolade"
          :class="{ 'accolade-strong': isAccolade(label) }"
        >
          <Trophy
            v-if="isAccolade(label)"
            :size="11"
            aria-hidden="true"
            class="opacity-80"
          />
          <span>{{ labelDisplay(label) }}</span>
        </Badge>
      </div>

      <!-- Types (review kind) -->
      <div v-if="tags.types.length" class="flex flex-wrap gap-1.5">
        <Badge
          v-for="kind in tags.types"
          :key="kind"
          variant="outline"
          class="text-[10.5px] tracking-wide uppercase"
        >
          {{ typeLabel(kind) }}
        </Badge>
      </div>

      <!-- Authors -->
      <div
        v-if="tags.authors.length"
        class="text-xs text-muted-foreground italic"
      >
        <span class="opacity-70 mr-1">—</span>
        <template
          v-for="(author, i) in tags.authors"
          :key="`${author.name}-${i}`"
        >
          <span
            class="not-italic font-medium cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-4"
            :title="authorRoleTitle(author)"
          >
            {{ author.name }}
          </span>
          <span v-if="i < tags.authors.length - 1">, </span>
        </template>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
/* Single-value tints picked to read on both light and dark `--card` surfaces.
 * Avoids :global() ancestor selectors entirely — Vue's scoped-CSS compiler
 * mishandles them and leaks the rule onto unrelated elements. */
.source-card[data-accent="amg"] {
  border-left-color: rgb(225 29 72 / 0.7);
}
.source-card[data-accent="tps"] {
  border-left-color: rgb(56 189 248 / 0.7);
}

.source-mark {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}
.source-card[data-accent="amg"] .source-mark {
  background: rgb(225 29 72 / 0.85);
}
.source-card[data-accent="tps"] .source-mark {
  background: rgb(56 189 248 / 0.85);
}

.source-card[data-accent="amg"] .amg-stars {
  color: rgb(244 63 94);
}

.source-card[data-accent="tps"] .score-numeric {
  color: rgb(56 189 248);
}

.source-card[data-accent="tps"] .score-fill {
  background: rgb(56 189 248 / 0.85);
}

.favorite-pick {
  color: rgb(245 158 11);
}

.accolade {
  font-size: 10.5px;
  letter-spacing: 0.04em;
}
.accolade-strong {
  background: color-mix(in srgb, currentColor 8%, transparent);
}
.source-card[data-accent="amg"] .accolade-strong {
  color: rgb(244 63 94);
  border-color: rgb(244 63 94 / 0.4);
}
.source-card[data-accent="tps"] .accolade-strong {
  color: rgb(56 189 248);
  border-color: rgb(56 189 248 / 0.4);
}
</style>
