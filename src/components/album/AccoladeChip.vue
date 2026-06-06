<script setup lang="ts">
import { computed } from "vue";
import { Trophy, ExternalLink, ChevronDown } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import type { ParsedAccolade } from "@/helpers/album_tags";
import type { ReviewLink } from "@/plugins/api/interfaces";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  accolade: ParsedAccolade;
  // post links whose label matches this accolade (0, 1, or several)
  links: ReviewLink[];
  accent: "amg" | "tps";
}
const props = defineProps<Props>();
const { t, te } = useI18n();

// Localized chip text: full name from the accolade namespace, with any inlined
// date ("(Sep 2024)") re-attached from the parsed display string.
const display = computed(() => {
  const a = props.accolade;
  if (a.kind === "unknown") return a.display;
  const key = `critical_reception.accolade.${a.kind}`;
  const base = te(key) ? t(key) : a.display;
  const paren = /\(([^)]*)\)\s*$/.exec(a.display);
  return paren ? `${base} (${paren[1]})` : base;
});

const singleTitle = computed(() =>
  props.links.length === 1 ? t("critical_reception.open_post") : undefined,
);
const menuTitle = computed(() =>
  t("critical_reception.choose_post", { count: props.links.length }),
);

function openLink(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

// A distinguishing label for a post in the menu: host + path (protocol and
// trailing slash stripped). The links share an accolade label, so the path is
// what tells the writers' posts apart.
function postName(link: ReviewLink): string {
  try {
    const u = new URL(link.url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "") || link.url;
  } catch {
    return link.url;
  }
}
</script>

<template>
  <!-- no link: inert chip -->
  <span
    v-if="links.length === 0"
    class="rs-chip"
    :class="accolade.isAward ? 'rs-chip--accolade' : 'rs-chip--type'"
    :data-accent="accent"
  >
    <Trophy v-if="accolade.isAward" :size="10" aria-hidden="true" />
    <span>{{ display }}</span>
  </span>

  <!-- single post: a real link (middle/ctrl-click friendly) -->
  <a
    v-else-if="links.length === 1"
    class="rs-chip rs-chip--link"
    :class="accolade.isAward ? 'rs-chip--accolade' : 'rs-chip--type'"
    :data-accent="accent"
    :href="links[0].url"
    target="_blank"
    rel="noopener noreferrer"
    :title="singleTitle"
  >
    <Trophy v-if="accolade.isAward" :size="10" aria-hidden="true" />
    <span>{{ display }}</span>
    <ExternalLink class="rs-chip__ext" :size="9" aria-hidden="true" />
  </a>

  <!-- multiple posts: pick one from a menu -->
  <DropdownMenu v-else>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="rs-chip rs-chip--link rs-chip--menu"
        :class="accolade.isAward ? 'rs-chip--accolade' : 'rs-chip--type'"
        :data-accent="accent"
        :title="menuTitle"
      >
        <Trophy v-if="accolade.isAward" :size="10" aria-hidden="true" />
        <span>{{ display }}</span>
        <span class="rs-chip__count">{{ links.length }}</span>
        <ChevronDown class="rs-chip__ext" :size="10" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="z-[100001] max-w-[340px]">
      <DropdownMenuLabel>{{ display }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="(link, i) in links"
        :key="`${link.url}-${i}`"
        @click="openLink(link.url)"
      >
        <ExternalLink class="size-4" />
        <span class="rs-post-name">{{ postName(link) }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<style scoped>
.rs-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border, #e5e7eb) 80%, transparent);
  color: var(--muted-foreground, #475569);
  background: transparent;
  white-space: nowrap;
}

.rs-chip--type {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 9.5px;
  opacity: 0.85;
}

.rs-chip--accolade[data-accent="amg"] {
  color: rgb(225 29 72);
  border-color: rgb(244 63 94 / 0.45);
  background: rgb(244 63 94 / 0.07);
}
.rs-chip--accolade[data-accent="tps"] {
  color: rgb(2 132 199);
  border-color: rgb(56 189 248 / 0.55);
  background: rgb(56 189 248 / 0.08);
}

/* Clickable chips (single link = <a>, multiple = menu <button>). Inherit the chip
   colour (no default link blue / button chrome) and gain a subtle hover lift. */
.rs-chip--link {
  cursor: pointer;
  text-decoration: none;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}
button.rs-chip {
  font-family: inherit;
  line-height: inherit;
}
.rs-chip--link:hover {
  border-color: color-mix(in srgb, currentColor 55%, transparent);
  background: color-mix(in srgb, currentColor 9%, transparent);
}
.rs-chip--link:focus-visible {
  outline: 2px solid color-mix(in srgb, currentColor 60%, transparent);
  outline-offset: 1px;
}
.rs-chip__ext {
  opacity: 0.6;
}
.rs-chip__count {
  font-variant-numeric: tabular-nums;
  font-size: 8.5px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 16%, transparent);
}

.rs-post-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
</style>
