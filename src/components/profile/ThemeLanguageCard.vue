<template>
  <Card data-testid="profile-theme-language">
    <CardHeader>
      <CardTitle>{{ $t("auth.profile_pages.theme_language") }}</CardTitle>
    </CardHeader>
    <CardContent>
      <FieldGroup>
        <FieldSet class="gap-3">
          <FieldLegend variant="label" class="mb-0">
            {{ $t("settings.theme.label") }}
          </FieldLegend>
          <!-- fork (HW-64): the home theme's choices replace auto/light/dark -->
          <Select
            v-if="homeThemeSelect"
            :model-value="homeThemeSelect.value"
            @update:model-value="setHomeTheme"
          >
            <SelectTrigger id="profile-theme" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in homeThemeSelect.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.title }}
              </SelectItem>
            </SelectContent>
          </Select>
          <RadioGroup
            v-else
            :model-value="theme"
            class="flex flex-wrap gap-6"
            @update:model-value="setTheme"
          >
            <Field
              v-for="option in THEME_PREFERENCES"
              :key="option"
              orientation="horizontal"
              class="w-auto"
            >
              <RadioGroupItem :id="`profile-theme-${option}`" :value="option" />
              <FieldLabel :for="`profile-theme-${option}`" class="font-normal">
                {{ $t(THEME_LABEL_KEYS[option]) }}
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <Field>
          <FieldLabel for="profile-language">
            {{ $t("settings.language.label") }}
          </FieldLabel>
          <Select :model-value="language" @update:model-value="setLanguage">
            <SelectTrigger id="profile-language" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in languageOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.title }}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </CardContent>

    <!-- Loading overlay; z-index clears the player bar (2001) floating above it -->
    <div
      v-if="reloading"
      data-testid="loading-overlay"
      class="fixed inset-0 z-[2100] flex items-center justify-center bg-background/80"
    >
      <Spinner class="size-16" />
    </div>
  </Card>
</template>

<script setup lang="ts">
import type { AcceptableValue } from "reka-ui";
import { computed, ref } from "vue";
import { toast } from "vue-sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  getThemePreference,
  isThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/composables/useThemePreference";
import { setUserPreferences } from "@/composables/userPreferences";
import {
  homeLanguageSelect,
  saveHomeLanguageEntry,
} from "@/plugins/home-language-settings";
import {
  homeThemeSelect,
  saveHomeThemeEntry,
} from "@/plugins/home-theme-settings";
import { $t, i18n } from "@/plugins/i18n";
import { store } from "@/plugins/store";

/**
 * The theme and language of the signed-in user, saved to the account as soon as
 * they are picked. A new theme shows right away; the app reloads to show a new
 * language.
 */

const AUTO_LANGUAGE = "auto";
const THEME_LABEL_KEYS: Readonly<Record<ThemePreference, string>> = {
  auto: "settings.theme.automatic",
  light: "settings.theme.options.light",
  dark: "settings.theme.options.dark",
};

const reloading = ref(false);

// NOTE: the app applies the theme as the preference changes; this card must not
// apply it — an extra useColorMode instance here would fight useThemePreference
// and desync tailwind from Vuetify.
const theme = computed(() => getThemePreference());

// TODO: Remove the localStorage fallback once migration period is over
// (language moved from localStorage to user preferences)
// fork (HW-190): with the home language, its choices replace the account's
const language = computed(
  () =>
    homeLanguageSelect.value?.value ||
    (store.currentUser?.preferences?.language as string | undefined) ||
    localStorage.getItem("frontend.settings.language") ||
    AUTO_LANGUAGE,
);

const languageOptions = computed(
  () =>
    homeLanguageSelect.value?.options ||
    [AUTO_LANGUAGE, ...i18n.global.availableLocales].map((value) => ({
      value,
      title: $t(`settings.language.options.${value}`, value),
    })),
);

async function setTheme(value: AcceptableValue): Promise<void> {
  if (!isThemePreference(value) || value === theme.value) return;
  if (await savePreference("theme", value)) {
    toast.success($t("settings.settings_saved"));
  }
}

// fork (HW-64): saved per user on the server (home_theme/choose), shown right away
async function setHomeTheme(value: AcceptableValue): Promise<void> {
  if (typeof value !== "string" || value === homeThemeSelect.value?.value)
    return;
  try {
    await saveHomeThemeEntry("theme", value);
    toast.success($t("settings.settings_saved"));
  } catch {
    toast.error($t("settings.save_failed"));
  }
}

async function setLanguage(value: AcceptableValue): Promise<void> {
  if (typeof value !== "string" || value === language.value) return;
  reloading.value = true;
  if (homeLanguageSelect.value) {
    // fork (HW-190): saved per user on the server (home_language/choose)
    try {
      await saveHomeLanguageEntry("language", value);
    } catch {
      reloading.value = false;
      toast.error($t("settings.save_failed"));
      return;
    }
  } else if (!(await savePreference("language", value))) {
    reloading.value = false;
    return;
  }
  // much of the app only takes up a new language as it starts; the overlay
  // stays up until the app has reloaded
  window.location.reload();
}

// says whether the account took the preference, telling the user when it did not
async function savePreference(key: string, value: string): Promise<boolean> {
  const saved = await setUserPreferences(
    { [key]: value },
    { suppressGlobalError: true },
  );
  if (!saved) toast.error($t("settings.save_failed"));
  return saved;
}
</script>
