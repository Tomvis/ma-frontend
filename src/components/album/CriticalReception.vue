<script setup lang="ts">
import { toRef } from "vue";
import type { Album } from "@/plugins/api/interfaces";
import { useAlbumTags } from "@/composables/useAlbumTags";
import DRCard from "./DRCard.vue";
import SourceCard from "./SourceCard.vue";

interface Props {
  album: Album;
}
const props = defineProps<Props>();
const albumRef = toRef(props, "album");
const tags = useAlbumTags(albumRef);
</script>

<template>
  <section v-if="tags.hasAny" class="critical-reception px-1 sm:px-0">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <DRCard
        v-if="tags.dr"
        :value="tags.dr.value"
        :quality="tags.dr.quality"
      />
      <SourceCard v-if="tags.amg" :tags="tags.amg" />
      <SourceCard v-if="tags.tps" :tags="tags.tps" />
    </div>
  </section>
</template>

<style scoped>
.critical-reception {
  margin-top: 4px;
  margin-bottom: 4px;
}
</style>
