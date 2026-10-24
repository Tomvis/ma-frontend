/**
 * Home language (HW-190), fork-only: shows the person's home language and
 * turns the page right-to-left for Hebrew (any RTL locale, however chosen).
 *
 * Upstream's App.vue still applies the language preference; this re-applies
 * the home language over it, so App.vue stays byte-identical to upstream.
 * State and rules: home-language-core.ts; the Settings entry:
 * home-language-settings.ts.
 */
import { api, ConnectionState } from "@/plugins/api";
import { EventType } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { i18n } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import { watch } from "vue";
import {
  homeLanguageState,
  isRtlLocale,
  type HomeLanguageState,
} from "./home-language-core";
import { homeLanguageEffective } from "./home-language-settings";
import vuetify from "./vuetify";

function applyLanguage(): void {
  const effective = homeLanguageEffective.value;
  if (effective && i18n.global.locale.value !== effective.locale)
    i18n.global.locale.value = effective.locale;
}

function applyDirection(locale: string): void {
  const rtl = isRtlLocale(locale);
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.lang = locale.replaceAll("_", "-");
  // Vuetify's own locale stays "en" (its strings); only its direction follows
  const rtlMap = vuetify.locale.rtl.value;
  const current = vuetify.locale.current.value;
  if (rtlMap[current] !== rtl)
    vuetify.locale.rtl.value = { ...rtlMap, [current]: rtl };
}

/** Read the signed-in user's home language from the server. */
export async function refreshHomeLanguage(): Promise<void> {
  const userId = store.currentUser?.user_id;
  if (!userId || authManager.isGuestAccessSession()) {
    homeLanguageState.value = null;
    return;
  }
  try {
    const state = await api.sendCommand<HomeLanguageState | null>(
      "home_language/get",
      {},
      { suppressGlobalError: true },
    );
    if (store.currentUser?.user_id === userId) homeLanguageState.value = state;
  } catch {
    // a server without home_language: upstream behaviour
    homeLanguageState.value = null;
  }
}

watch(homeLanguageEffective, applyLanguage);
// upstream re-applies its preference when the user loads; the home language wins
watch(() => i18n.global.locale.value, applyLanguage);
watch(() => i18n.global.locale.value, applyDirection, { immediate: true });
watch(() => store.currentUser?.user_id, refreshHomeLanguage);
watch(
  () => api.state.value,
  (state) => {
    if (state === ConnectionState.INITIALIZED) void refreshHomeLanguage();
  },
);
api.subscribe(
  EventType.PROVIDER_EVENT,
  (event: { data?: { user_id?: string; setting?: string } }) => {
    if (
      event.data?.user_id &&
      event.data.user_id === store.currentUser?.user_id &&
      event.data.setting !== "home_theme"
    )
      void refreshHomeLanguage();
  },
  "home_theme",
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshHomeLanguage();
});
