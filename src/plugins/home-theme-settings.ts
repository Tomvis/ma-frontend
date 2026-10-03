/**
 * Home theme (HW-64), fork-only: the Settings › Interface "Theme" entry.
 *
 * With the server's home_theme provider in use, upstream's auto/light/dark
 * entry becomes "Follow home theme" plus every theme × mode, saved per user on
 * the server (home_theme/choose) instead of in the preferences.
 */
import { api } from "@/plugins/api";
import type { ConfigEntry, ConfigValueType } from "@/plugins/api/interfaces";
import {
  choiceValue,
  FOLLOW,
  homeThemeCatalog,
  homeThemeEffective,
  homeThemeState,
  parseChoiceValue,
  themeOptions,
  type HomeThemeState,
} from "./home-theme-core";

const ENTRY_KEY = "theme";

/** Upstream's theme entry, or the home theme one when the server has it. */
export function homeThemeEntry(entry: ConfigEntry): ConfigEntry {
  const state = homeThemeState.value;
  if (!state) return entry;
  const effective = homeThemeEffective.value;
  return {
    ...entry,
    default_value: FOLLOW,
    options: themeOptions(homeThemeCatalog.value, state.claim),
    value: effective?.source === "app" ? choiceValue(effective) : FOLLOW,
  };
}

/** Save the in-app choice; null to clear it ("Follow home theme"). */
export async function chooseHomeTheme(
  choice: { theme: string; mode: string } | null,
): Promise<void> {
  const state = await api.sendCommand<HomeThemeState>(
    "home_theme/choose",
    choice ? { theme: choice.theme, mode: choice.mode } : {},
  );
  homeThemeState.value = state;
}

/**
 * Handle the theme entry on save. Says whether it did (the caller then
 * skips it), which is only when the home theme is in use.
 */
export async function saveHomeThemeEntry(
  key: string,
  value: ConfigValueType,
): Promise<boolean> {
  if (key !== ENTRY_KEY || !homeThemeState.value) return false;
  const effective = homeThemeEffective.value;
  const current = effective?.source === "app" ? choiceValue(effective) : FOLLOW;
  if (value !== current) await chooseHomeTheme(parseChoiceValue(value));
  return true;
}
