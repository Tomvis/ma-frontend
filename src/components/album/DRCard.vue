<script setup lang="ts">
import { computed } from "vue";
import { Activity } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { Card, CardContent } from "@/components/ui/card";
import type { DRQuality } from "@/helpers/album_tags";

interface Props {
  value: number;
  quality: DRQuality;
}
const props = defineProps<Props>();
const { t } = useI18n();

const verdict = computed(() =>
  t(`critical_reception.dr_quality.${props.quality}`),
);
</script>

<template>
  <Card
    class="dr-card relative flex flex-col justify-between gap-2 overflow-hidden border-l-2 py-4"
  >
    <CardContent class="flex flex-col gap-3 px-4">
      <header class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <Activity
            :size="14"
            class="dr-mark"
            stroke-width="2.25"
            aria-hidden="true"
          />
          <span
            class="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground"
          >
            {{ $t("critical_reception.dynamic_range") }}
          </span>
        </div>
      </header>
      <div class="flex items-baseline gap-2">
        <span
          class="font-mono text-5xl leading-none tabular-nums dr-value"
          :data-quality="props.quality"
        >
          {{ props.value }}
        </span>
        <span
          class="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground"
          >DR</span
        >
      </div>
      <div
        class="text-xs font-medium tracking-wide uppercase dr-verdict"
        :data-quality="props.quality"
      >
        {{ verdict }}
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
/* Single-value tints picked to read on both light and dark `--card` surfaces. */
.dr-card {
  border-left-color: rgb(113 113 122 / 0.7);
}
.dr-mark {
  color: rgb(113 113 122 / 0.9);
}
.dr-value[data-quality="excellent"] {
  color: rgb(34 197 94);
}
.dr-value[data-quality="good"] {
  color: rgb(59 130 246);
}
.dr-value[data-quality="fair"] {
  color: rgb(234 179 8);
}
.dr-value[data-quality="poor"] {
  color: rgb(239 68 68);
}
.dr-verdict {
  color: var(--muted-foreground, rgb(113 113 122));
}
</style>
