<script setup lang="ts">
import api from "@/plugins/api";
import { type MediaItemType } from "@/plugins/api/interfaces";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { toast } from "vue-sonner";

interface Props {
  item: MediaItemType;
  readonly?: boolean;
  size?: string | number;
  density?: "comfortable" | "compact" | "default";
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  size: "small",
  density: "compact",
  compact: false,
});

const { t } = useI18n();
const busy = ref(false);

const onChange = async (newValue: string | number) => {
  if (props.readonly || busy.value) return;
  // Vuetify's v-rating emits 0 when the currently selected star is clicked
  // (clearable behaviour) — we treat that as "unrated" on the server.
  const numericValue =
    typeof newValue === "string" ? Number(newValue) : newValue;
  const nextRating: number | null = numericValue === 0 ? null : numericValue;
  if (nextRating === (props.item.rating ?? null)) return;
  busy.value = true;
  try {
    // api.setRating does an optimistic mutation + revert-on-failure internally
    await api.setRating(props.item, nextRating);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    toast.error(`${t("rating_failed")} — ${detail}`);
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="rating-button">
    <span v-if="compact && item.rating != null" class="rating-compact">
      <v-icon class="rating-compact-icon" color="amber" icon="mdi-star" />
      <span class="rating-compact-value">{{ item.rating }}</span>
    </span>
    <v-rating
      v-else
      :model-value="item.rating ?? 0"
      :length="5"
      :density="density"
      :size="size"
      :readonly="readonly || busy"
      :clearable="!readonly"
      color="amber-darken-2"
      active-color="amber"
      :half-increments="false"
      hover
      @update:model-value="onChange"
      @click.stop
      @click.prevent
    />
  </div>
</template>

<style scoped>
.rating-button {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  min-width: 0;
}

.rating-button :deep(.v-rating__item) {
  padding: 0;
}

.rating-button :deep(.v-rating__item .v-btn) {
  padding: 0;
  width: auto;
  min-width: 0;
  --v-btn-height: auto;
}

.rating-compact {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  gap: 4px;
  height: 48px;
  padding: 0 12px;
  line-height: 1;
}

.rating-compact-icon {
  font-size: 24px;
  line-height: 1;
}

.rating-compact-value {
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  opacity: 0.85;
  line-height: 1;
}
</style>
