/**
 * Home theme (HW-48), fork-only: re-colours both Vuetify themes in place
 * (Vuetify's documented runtime theme API) and loads the brand CSS last, so
 * vuetify.ts / style.css stay byte-identical to upstream. The user's
 * auto/light/dark preference keeps switching between these two themes.
 */
import "@/styles/home-brand.css";
import vuetify from "./vuetify";

const HOME_COLORS: Record<"light" | "dark", Record<string, string>> = {
  light: {
    fg: "#16222A",
    background: "#EAF0F0",
    overlay: "#DCE6E8",
    panel: "#FFFFFF",
    default: "#FFFFFF",
    surface: "#FFFFFF",
    primary: "#466A77",
    "on-primary": "#FFFFFF",
    secondary: "#587E8D",
    info: "#466A77",
    error: "#B0233D",
    warning: "#8A5300",
    success: "#0F6E4E",
  },
  dark: {
    fg: "#EAF0F0",
    background: "#16222A",
    overlay: "#16222A",
    panel: "#1F2F38",
    surface: "#1F2F38",
    primary: "#8DB0BD",
    "on-primary": "#16222A",
    secondary: "#6E8F9B",
    info: "#BAD2DE",
    error: "#FF8AA0",
    warning: "#F5B14C",
    success: "#36E0A0",
  },
};

for (const [name, colors] of Object.entries(HOME_COLORS)) {
  const theme = vuetify.theme.themes.value[name];
  if (theme) Object.assign(theme.colors, colors);
}
