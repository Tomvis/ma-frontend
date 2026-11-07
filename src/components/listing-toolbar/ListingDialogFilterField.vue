<!--
  Fork: a group of filters with its own dialog (the review filters), as one
  field of the Filters panel. Laid out like ListingMultiFilterField's dropdown,
  with a chevron that points on to the dialog instead of down.
-->
<template>
  <div class="flex flex-col gap-2">
    <span :id="labelId" :class="SECTION_LABEL_CLASS">{{ filter.label }}</span>
    <Button
      variant="outline"
      class="h-10 w-full justify-between font-normal"
      :aria-labelledby="`${labelId} ${summaryId}`"
      aria-haspopup="dialog"
      @click="openDialog"
    >
      <span :id="summaryId" class="min-w-0 truncate">{{ filter.summary }}</span>
      <ChevronRight class="text-muted-foreground" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import type { ListingDialogFilter } from "@/helpers/listing_filters";
import { ChevronRight } from "@lucide/vue";
import { useId } from "vue";
import { SECTION_LABEL_CLASS } from "./constants";

const props = defineProps<{
  filter: ListingDialogFilter;
}>();

const emit = defineEmits<{
  // the panel closes, so the dialog does not open under it
  open: [];
}>();

const labelId = useId();
const summaryId = useId();

const openDialog = () => {
  emit("open");
  props.filter.open();
};
</script>
