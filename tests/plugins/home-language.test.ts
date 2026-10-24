import { describe, expect, it } from "vitest";
import {
  isRtlLocale,
  languageOptions,
  resolveHomeLanguage,
} from "@/plugins/home-language-core";

const available = ["en", "he", "ru_RU", "sr_Latn"];

describe("resolveHomeLanguage", () => {
  it("leaves upstream's preference alone without a claim", () => {
    expect(resolveHomeLanguage(null, available)).toBeNull();
    expect(
      resolveHomeLanguage({ claim: null, choice: null }, available),
    ).toBeNull();
  });

  it("shows the claim", () => {
    expect(
      resolveHomeLanguage(
        { claim: { language: "ru_RU", override: "follow" }, choice: null },
        available,
      ),
    ).toEqual({ locale: "ru_RU", source: "home" });
  });

  it("shows the in-app choice while its basis is the claim's override", () => {
    const choice = { language: "he", basis: "follow" };
    expect(
      resolveHomeLanguage(
        { claim: { language: "ru_RU", override: "follow" }, choice },
        available,
      ),
    ).toEqual({ locale: "he", source: "app" });
    expect(resolveHomeLanguage({ claim: null, choice }, available)).toEqual({
      locale: "he",
      source: "app",
    });
  });

  it("drops a choice made under another override", () => {
    expect(
      resolveHomeLanguage(
        {
          claim: { language: "ru_RU", override: "ru" },
          choice: { language: "he", basis: "follow" },
        },
        available,
      ),
    ).toEqual({ locale: "ru_RU", source: "home" });
  });

  it("falls back to English for a language MA lacks", () => {
    expect(
      resolveHomeLanguage(
        { claim: { language: "ka", override: "follow" }, choice: null },
        available,
      ),
    ).toEqual({ locale: "en", source: "home" });
  });
});

describe("isRtlLocale", () => {
  it("is right-to-left for Hebrew only among these", () => {
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("he_IL")).toBe(true);
    expect(isRtlLocale("ru_RU")).toBe(false);
    expect(isRtlLocale("sr_Latn")).toBe(false);
  });
});

describe("languageOptions", () => {
  it("starts with Follow home language, naming the claim's language", () => {
    const options = languageOptions(
      available,
      { language: "ru_RU", override: "follow" },
      "en",
    );
    expect(options[0]).toEqual({
      title: "Follow home language (Russian (Russia))",
      value: "follow",
    });
    expect(options.slice(1).map((option) => option.value)).toEqual(available);
  });
});
