import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cssVars,
  homeThemeCatalog,
  homeThemeMode,
  homeThemeState,
  isCatalog,
  parseChoiceValue,
  resolveHomeTheme,
  themeOptions,
  themeStylesheet,
  vuetifyColors,
  type Claim,
  type HomeMode,
} from "@/plugins/home-theme-core";
import {
  homeThemeEntry,
  saveHomeThemeEntry,
} from "@/plugins/home-theme-settings";
import { ConfigEntryType, type ConfigEntry } from "@/plugins/api/interfaces";

const sendCommand = vi.fn();
vi.mock("@/plugins/api", () => {
  const api = { sendCommand: (...args: unknown[]) => sendCommand(...args) };
  return { api, default: api };
});

const catalog = homeThemeCatalog.value;
const claim = (
  theme: string,
  mode: HomeMode = "automatic",
  override = "follow",
): Claim => ({ theme, mode, override });

describe("resolveHomeTheme", () => {
  it("defaults without a claim", () => {
    expect(resolveHomeTheme(null, catalog)).toEqual({
      theme: "slate",
      mode: "automatic",
      source: "default",
    });
  });

  it("follows the claim without an in-app choice", () => {
    const state = { claim: claim("rave", "dark"), choice: null };
    expect(resolveHomeTheme(state, catalog)).toMatchObject({
      theme: "rave",
      mode: "dark",
      source: "home",
    });
  });

  it("keeps the in-app choice while its basis matches the override", () => {
    const state = {
      claim: claim("lagoon", "light"),
      choice: { theme: "mint", mode: "dark" as const, basis: "follow" },
    };
    expect(resolveHomeTheme(state, catalog)).toMatchObject({
      theme: "mint",
      source: "app",
    });
  });

  it("drops a choice made against another override", () => {
    const state = {
      claim: claim("lagoon", "light", "lagoon/light"),
      choice: { theme: "mint", mode: "dark" as const, basis: "follow" },
    };
    expect(resolveHomeTheme(state, catalog).source).toBe("home");
  });

  it("maps an unknown theme to the default", () => {
    const state = { claim: claim("no-such-theme", "dark"), choice: null };
    expect(resolveHomeTheme(state, catalog).theme).toBe("slate");
  });
});

describe("palette", () => {
  it("vendors a valid catalog", () => {
    expect(isCatalog(catalog)).toBe(true);
    expect(isCatalog({ default: "x", themes: [] })).toBe(false);
  });

  it("maps slate to the HW-48 colours", () => {
    const slate = catalog.themes.find((t) => t.id === "slate")!;
    expect(vuetifyColors(slate.modes.light, "light")).toMatchObject({
      background: "#EAF0F0",
      primary: "#466A77",
      secondary: "#587E8D",
      default: "#FFFFFF",
    });
    expect(vuetifyColors(slate.modes.dark, "dark")).toMatchObject({
      overlay: "#16222A",
      info: "#BAD2DE",
    });
    expect(cssVars(slate.modes.dark, "dark")["--sidebar-accent"]).toBe(
      "rgba(141, 176, 189, 0.14)",
    );
  });

  it("gives every theme both modes", () => {
    for (const theme of catalog.themes) {
      const css = themeStylesheet(theme);
      expect(css).toContain(`--background:${theme.modes.light.bg}`);
      expect(css).toContain(`--background:${theme.modes.dark.bg}`);
      expect(css).not.toContain("undefined");
    }
  });
});

describe("settings entry", () => {
  const upstream: ConfigEntry = {
    key: "theme",
    type: ConfigEntryType.STRING,
    label: "theme",
    default_value: "auto",
    required: false,
    options: [{ title: "auto", value: "auto" }],
    multi_value: false,
    category: "preferences",
    value: "auto",
  };

  beforeEach(() => {
    sendCommand.mockReset();
    homeThemeState.value = null;
  });

  it("offers follow plus every theme × mode", () => {
    const options = themeOptions(catalog, claim("rave", "dark"));
    expect(options[0]).toEqual({
      title: "Follow home theme (Rave · Dark)",
      value: "follow",
    });
    expect(options).toHaveLength(1 + catalog.themes.length * 3);
    expect(parseChoiceValue("mint/light")).toEqual({
      theme: "mint",
      mode: "light",
    });
    expect(parseChoiceValue("follow")).toBeNull();
  });

  it("stays upstream's without the home theme", async () => {
    expect(homeThemeEntry(upstream)).toBe(upstream);
    expect(await saveHomeThemeEntry("theme", "dark")).toBe(false);
    expect(homeThemeMode.value).toBeNull();
  });

  it("saves a choice and follow on the server", async () => {
    homeThemeState.value = { claim: claim("slate"), choice: null };
    expect(homeThemeEntry(upstream).value).toBe("follow");
    expect(homeThemeMode.value).toBe("auto");

    const chosen = {
      claim: claim("slate"),
      choice: { theme: "mint", mode: "dark" as const, basis: "follow" },
    };
    sendCommand.mockResolvedValueOnce(chosen);
    expect(await saveHomeThemeEntry("theme", "mint/dark")).toBe(true);
    expect(sendCommand).toHaveBeenCalledWith("home_theme/choose", {
      theme: "mint",
      mode: "dark",
    });
    expect(homeThemeEntry(upstream).value).toBe("mint/dark");
    expect(homeThemeMode.value).toBe("dark");

    sendCommand.mockResolvedValueOnce({ claim: claim("slate"), choice: null });
    await saveHomeThemeEntry("theme", "follow");
    expect(sendCommand).toHaveBeenLastCalledWith("home_theme/choose", {});

    // unchanged: nothing written
    sendCommand.mockClear();
    await saveHomeThemeEntry("theme", "follow");
    expect(sendCommand).not.toHaveBeenCalled();
  });

  it("leaves other keys alone", async () => {
    homeThemeState.value = { claim: null, choice: null };
    expect(await saveHomeThemeEntry("language", "en")).toBe(false);
  });
});
