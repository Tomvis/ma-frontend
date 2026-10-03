/**
 * Home theme (HW-64), fork-only: the person's theme × mode, side-effect free.
 *
 * The server's home_theme provider holds two things per user:
 * - claim: what the household's authentik settings say for Music Assistant,
 *   pushed by home-monitoring's theme_sync: {theme, mode, override}.
 * - choice: a theme picked inside Music Assistant, kept with the claim's
 *   override at that moment (basis).
 * The choice wins while its basis matches the claim's override; otherwise the
 * claim does (the server also drops such a stale choice). No claim → default.
 */
import { computed, ref, shallowRef } from "vue";
import vendored from "./home-theme-catalog.json";

export type HomeMode = "automatic" | "light" | "dark";
export const HOME_MODES: HomeMode[] = ["automatic", "light", "dark"];
export const FOLLOW = "follow";

export type Roles = Record<string, string>;
export interface CatalogTheme {
  id: string;
  name: string;
  description?: string;
  designed_as?: string;
  modes: { light: Roles; dark: Roles };
}
export interface Catalog {
  default: string;
  themes: CatalogTheme[];
}
export interface Claim {
  theme: string;
  mode: HomeMode;
  override: string;
}
export interface Choice {
  theme: string;
  mode: HomeMode;
  basis: string;
}
export interface HomeThemeState {
  user_id?: string;
  claim: Claim | null;
  choice: Choice | null;
}
export interface Effective {
  theme: string;
  mode: HomeMode;
  source: "app" | "home" | "default";
}

export const CATALOG_URL = "https://theme.leratom.cloud/dist/themes/all.json";
const LAST_KEY = "home_theme.last";

export function isCatalog(value: unknown): value is Catalog {
  const catalog = value as Catalog;
  return (
    !!catalog &&
    typeof catalog.default === "string" &&
    Array.isArray(catalog.themes) &&
    catalog.themes.length > 0 &&
    catalog.themes.every(
      (theme) =>
        typeof theme?.id === "string" &&
        !!theme.modes?.light?.bg &&
        !!theme.modes?.dark?.bg,
    )
  );
}

function isMode(value: unknown): value is HomeMode {
  return HOME_MODES.includes(value as HomeMode);
}

/** The theme to show: the in-app choice if still current, else the claim. */
export function resolveHomeTheme(
  state: HomeThemeState | null,
  catalog: Catalog,
): Effective {
  const known = (id: string | undefined) =>
    catalog.themes.some((theme) => theme.id === id) ? id! : catalog.default;
  const claim = state?.claim;
  const choice = state?.choice;
  if (choice && choice.basis === (claim?.override ?? FOLLOW)) {
    return {
      theme: known(choice.theme),
      mode: isMode(choice.mode) ? choice.mode : "automatic",
      source: "app",
    };
  }
  if (claim) {
    return {
      theme: known(claim.theme),
      mode: isMode(claim.mode) ? claim.mode : "automatic",
      source: "home",
    };
  }
  return { theme: catalog.default, mode: "automatic", source: "default" };
}

export function catalogTheme(catalog: Catalog, id: string): CatalogTheme {
  return (
    catalog.themes.find((theme) => theme.id === id) ??
    catalog.themes.find((theme) => theme.id === catalog.default) ??
    catalog.themes[0]
  );
}

/** Vuetify colours for one mode (mapping from HW-48). */
export function vuetifyColors(
  roles: Roles,
  mode: "light" | "dark",
): Record<string, string> {
  return {
    fg: roles.text,
    background: roles.bg,
    overlay: mode === "light" ? roles["surface-2"] : roles.bg,
    panel: roles.surface,
    ...(mode === "light" ? { default: roles.surface } : {}),
    surface: roles.surface,
    primary: roles.primary,
    "on-primary": roles["on-primary"],
    secondary: roles["border-strong"],
    info: roles.link,
    error: roles.alarm,
    warning: roles.warning,
    success: roles.success,
  };
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** CSS custom properties (tailwind/shadcn tokens + --home-*) for one mode. */
export function cssVars(
  roles: Roles,
  mode: "light" | "dark",
): Record<string, string> {
  const accent =
    mode === "light"
      ? rgba(roles["border-strong"], 0.12)
      : rgba(roles.primary, 0.14);
  return {
    "--home-lit": roles.lit,
    "--home-lit-fill": roles["lit-fill"],
    "--home-on-lit": roles["on-lit"],
    "--background": roles.bg,
    "--foreground": roles.text,
    "--card": roles.surface,
    "--card-foreground": roles.text,
    "--popover": roles.surface,
    "--popover-foreground": roles.text,
    "--primary": roles.primary,
    "--primary-foreground": roles["on-primary"],
    "--secondary": roles["surface-2"],
    "--secondary-foreground": roles.text,
    "--muted": roles["surface-2"],
    "--muted-foreground": roles["text-2"],
    "--accent": roles["surface-2"],
    "--accent-foreground": roles.text,
    "--destructive": roles.alarm,
    "--border": roles.border,
    "--input": roles.border,
    "--ring": roles.primary,
    "--chart-1": roles.primary,
    "--chart-2": roles.success,
    "--chart-3": roles.warning,
    "--sidebar": roles.surface,
    "--sidebar-foreground": roles.text,
    "--sidebar-primary": roles.primary,
    "--sidebar-primary-foreground": roles["on-primary"],
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": roles.text,
    "--sidebar-border": roles.border,
    "--sidebar-ring": roles.primary,
  };
}

/** Variables Login.vue scopes to its own view. */
export function loginVars(
  roles: Roles,
  mode: "light" | "dark",
): Record<string, string> {
  return {
    "--fg": roles.text,
    "--background": roles.bg,
    "--panel": roles.surface,
    "--primary": roles.primary,
    "--text-secondary": roles["text-2"],
    "--text-tertiary": roles["text-disabled"],
    "--border": roles.border,
    ...(mode === "dark" ? { "--input-bg": rgba(roles.text, 0.05) } : {}),
    "--input-focus-bg": rgba(roles.primary, mode === "light" ? 0.06 : 0.08),
    "--error-text": roles.alarm,
    "--success": roles.success,
  };
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";")}}`;

/** The stylesheet carrying one theme's palette for both modes. */
export function themeStylesheet(theme: CatalogTheme): string {
  const { light, dark } = theme.modes;
  return [
    block(":root", cssVars(light, "light")),
    block(".dark", cssVars(dark, "dark")),
    block(":root .v-main.login-background", loginVars(light, "light")),
    `@media (prefers-color-scheme: dark){${block(":root .v-main.login-background", loginVars(dark, "dark"))}}`,
    block(":root .container-panel.container-panel--light", {
      background: light.bg,
    }),
  ].join("\n");
}

const MODE_LABELS: Record<HomeMode, string> = {
  automatic: "Automatic",
  light: "Light",
  dark: "Dark",
};

export function choiceValue(choice: { theme: string; mode: HomeMode }) {
  return `${choice.theme}/${choice.mode}`;
}

export function parseChoiceValue(
  value: unknown,
): { theme: string; mode: HomeMode } | null {
  if (typeof value !== "string" || value === FOLLOW) return null;
  const [theme, mode] = value.split("/");
  return theme && isMode(mode) ? { theme, mode } : null;
}

/** Settings options: "Follow home theme" plus every theme × mode. */
export function themeOptions(
  catalog: Catalog,
  claim: Claim | null,
): { title: string; value: string }[] {
  const name = (id: string) => catalogTheme(catalog, id).name;
  const home = claim
    ? `${name(claim.theme)} · ${MODE_LABELS[isMode(claim.mode) ? claim.mode : "automatic"]}`
    : `${name(catalog.default)} · ${MODE_LABELS.automatic}`;
  return [
    { title: `Follow home theme (${home})`, value: FOLLOW },
    ...catalog.themes.flatMap((theme) =>
      HOME_MODES.map((mode) => ({
        title: `${theme.name} · ${MODE_LABELS[mode]}`,
        value: choiceValue({ theme: theme.id, mode }),
      })),
    ),
  ];
}

function readLast(): { theme: string; mode: HomeMode } | null {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    return last && typeof last.theme === "string" && isMode(last.mode)
      ? last
      : null;
  } catch {
    return null;
  }
}

export function rememberLast(effective: Effective): void {
  try {
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({ theme: effective.theme, mode: effective.mode }),
    );
  } catch {
    // first paint just falls back to the default
  }
}

/** The catalog in use: the vendored copy until the live one has loaded. */
export const homeThemeCatalog = shallowRef<Catalog>(vendored as Catalog);
/** The signed-in user's server state; null until known (or without the provider). */
export const homeThemeState = ref<HomeThemeState | null>(null);
const last = readLast();

/** What to show now; before the server answered, this device's last theme. */
export const homeThemeEffective = computed<Effective | null>(() => {
  if (homeThemeState.value)
    return resolveHomeTheme(homeThemeState.value, homeThemeCatalog.value);
  return last ? { ...last, source: "default" } : null;
});

/** MA's own auto/light/dark, when the home theme decides it. */
export const homeThemeMode = computed<"auto" | "light" | "dark" | null>(() => {
  const mode = homeThemeEffective.value?.mode;
  if (!mode) return null;
  return mode === "automatic" ? "auto" : mode;
});
