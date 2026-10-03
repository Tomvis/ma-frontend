/**
 * Home theme (HW-48, HW-64), fork-only: paints the person's home theme.
 *
 * Re-colours both Vuetify themes in place (Vuetify's documented runtime theme
 * API) and writes the tailwind/brand variables into one <style>, so
 * vuetify.ts / style.css stay byte-identical to upstream. Which of the two
 * Vuetify themes shows is still upstream's useThemePreference, fed the home
 * theme's mode through homeThemeMode. State and rules: home-theme-core.ts.
 */
import "@/styles/home-brand.css";
import { api, ConnectionState } from "@/plugins/api";
import { EventType } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { watch } from "vue";
import {
  CATALOG_URL,
  catalogTheme,
  homeThemeCatalog,
  homeThemeEffective,
  homeThemeState,
  isCatalog,
  rememberLast,
  themeStylesheet,
  vuetifyColors,
  type HomeThemeState,
} from "./home-theme-core";
import vuetify from "./vuetify";

const STYLE_ID = "home-theme-palette";

function paint(): void {
  const effective = homeThemeEffective.value;
  const theme = catalogTheme(
    homeThemeCatalog.value,
    effective?.theme ?? homeThemeCatalog.value.default,
  );
  for (const mode of ["light", "dark"] as const) {
    const target = vuetify.theme.themes.value[mode];
    if (target)
      Object.assign(target.colors, vuetifyColors(theme.modes[mode], mode));
  }
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = themeStylesheet(theme);
  if (effective && effective.source !== "default") rememberLast(effective);
}

let catalogRequested = false;
async function loadCatalog(): Promise<void> {
  if (catalogRequested) return;
  catalogRequested = true;
  try {
    const response = await fetch(CATALOG_URL, { cache: "no-cache" });
    const catalog: unknown = await response.json();
    if (isCatalog(catalog)) homeThemeCatalog.value = catalog;
  } catch {
    // offline or blocked: the vendored copy stays
  }
}

/** Read the signed-in user's home theme from the server. */
export async function refreshHomeTheme(): Promise<void> {
  const userId = store.currentUser?.user_id;
  if (!userId || authManager.isGuestAccessSession()) {
    homeThemeState.value = null;
    return;
  }
  void loadCatalog();
  try {
    const state = await api.sendCommand<HomeThemeState | null>(
      "home_theme/get",
      {},
      { suppressGlobalError: true },
    );
    if (store.currentUser?.user_id === userId) homeThemeState.value = state;
  } catch {
    // a server without the home_theme provider: upstream behaviour
    homeThemeState.value = null;
  }
}

watch([homeThemeEffective, homeThemeCatalog], paint, { immediate: true });
watch(() => store.currentUser?.user_id, refreshHomeTheme);
watch(
  () => api.state.value,
  (state) => {
    if (state === ConnectionState.INITIALIZED) void refreshHomeTheme();
  },
);
api.subscribe(
  EventType.PROVIDER_EVENT,
  (event: { data?: { user_id?: string } }) => {
    if (
      event.data?.user_id &&
      event.data.user_id === store.currentUser?.user_id
    )
      void refreshHomeTheme();
  },
  "home_theme",
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshHomeTheme();
});
