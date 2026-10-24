/**
 * Home language (HW-190), fork-only: the Settings › Interface "Language" entry.
 *
 * With the server's home_language commands in use, upstream's entry becomes
 * "Follow home language" plus every locale, saved per user on the server
 * (home_language/choose) instead of in the preferences.
 */
import { api } from "@/plugins/api";
import type { ConfigEntry, ConfigValueType } from "@/plugins/api/interfaces";
import { i18n } from "@/plugins/i18n";
import { computed } from "vue";
import {
  homeLanguageState,
  languageOptions,
  resolveHomeLanguage,
  type HomeLanguageState,
} from "./home-language-core";
import { FOLLOW } from "./home-theme-core";

const ENTRY_KEY = "language";

const available = () => Array.from(i18n.global.availableLocales);
export const homeLanguageEffective = computed(() =>
  resolveHomeLanguage(homeLanguageState.value, available()),
);

/** Upstream's language entry, or the home language one when the server has it. */
export function homeLanguageEntry(entry: ConfigEntry): ConfigEntry {
  const state = homeLanguageState.value;
  if (!state) return entry;
  const effective = homeLanguageEffective.value;
  return {
    ...entry,
    default_value: FOLLOW,
    options: languageOptions(
      available(),
      state.claim,
      i18n.global.locale.value,
    ),
    value: effective?.source === "app" ? effective.locale : FOLLOW,
  };
}

/**
 * Handle the language entry on save. Says whether it did (the caller then
 * skips it), which is only when the home language is in use.
 */
export async function saveHomeLanguageEntry(
  key: string,
  value: ConfigValueType,
): Promise<boolean> {
  if (key !== ENTRY_KEY || !homeLanguageState.value) return false;
  const effective = homeLanguageEffective.value;
  const current = effective?.source === "app" ? effective.locale : FOLLOW;
  if (value !== current) {
    const language =
      typeof value === "string" && value !== FOLLOW ? value : null;
    homeLanguageState.value = await api.sendCommand<HomeLanguageState>(
      "home_language/choose",
      language ? { language } : {},
    );
  }
  return true;
}
