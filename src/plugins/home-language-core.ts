/**
 * Home language (HW-190), fork-only: the person's UI language, side-effect free.
 *
 * The server's home_theme provider holds, beside the theme (home-theme-core.ts),
 * the same two things for the language:
 * - claim: what the household's authentik settings say for Music Assistant,
 *   pushed by home-monitoring's theme_sync: {language, override}.
 * - choice: a language picked inside Music Assistant, kept with the claim's
 *   override at that moment (basis).
 * The choice wins while its basis matches the claim's override; otherwise the
 * claim does. No claim → upstream's own language preference.
 */
import { getLocaleDisplayName, resolveLocale } from "./i18n";
import { FOLLOW } from "./home-theme-core";

export interface LanguageClaim {
  language: string;
  override: string;
}
export interface LanguageChoice {
  language: string;
  basis: string;
}
export interface HomeLanguageState {
  user_id?: string;
  claim: LanguageClaim | null;
  choice: LanguageChoice | null;
}
export interface EffectiveLanguage {
  /** One of the available locales. */
  locale: string;
  source: "app" | "home";
}

// right-to-left scripts among MA's translations (and Vuetify's own list)
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "yi", "ckb"]);

/** The language to show: the in-app choice if still current, else the claim. */
export function resolveHomeLanguage(
  state: HomeLanguageState | null,
  available: readonly string[],
): EffectiveLanguage | null {
  const claim = state?.claim;
  const choice = state?.choice;
  if (choice && choice.basis === (claim?.override ?? FOLLOW))
    return { locale: resolveLocale(choice.language, available), source: "app" };
  if (claim)
    return { locale: resolveLocale(claim.language, available), source: "home" };
  return null;
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGES.has(locale.toLowerCase().split(/[-_]/)[0]);
}

/** Settings options: "Follow home language" plus every available locale. */
export function languageOptions(
  available: readonly string[],
  claim: LanguageClaim | null,
  displayLocale: string,
): { title: string; value: string }[] {
  const home = claim
    ? getLocaleDisplayName(
        resolveLocale(claim.language, available),
        displayLocale,
      )
    : "auto";
  return [
    { title: `Follow home language (${home})`, value: FOLLOW },
    ...available.map((locale) => ({ title: locale, value: locale })),
  ];
}
