// fork (HW-64/HW-190, HW-331): the Profile page's theme and language with the
// home theme/language in use; upstream 2.17.376 moved both settings there
import ThemeLanguageCard from "@/components/profile/ThemeLanguageCard.vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveHomeThemeEntry: vi.fn(async () => true),
  saveHomeLanguageEntry: vi.fn(async () => true),
  setUserPreferences: vi.fn(async () => true),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/plugins/home-theme-settings", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    homeThemeSelect: ref({
      value: "follow",
      options: [
        { title: "Follow home theme (Mint · Automatic)", value: "follow" },
        { title: "Mint · Dark", value: "mint/dark" },
      ],
    }),
    saveHomeThemeEntry: mocks.saveHomeThemeEntry,
  };
});
vi.mock("@/plugins/home-language-settings", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  return {
    homeLanguageSelect: ref({
      value: "follow",
      options: [
        { title: "Follow home language (English)", value: "follow" },
        { title: "nl", value: "nl" },
      ],
    }),
    saveHomeLanguageEntry: mocks.saveHomeLanguageEntry,
  };
});
vi.mock("@/plugins/store", () => ({ store: { currentUser: undefined } }));
vi.mock("@/plugins/auth", () => ({
  authManager: { isGuestAccessSession: () => false },
}));
vi.mock("@/plugins/i18n", () => ({
  $t: (key: string) => key,
  i18n: { global: { availableLocales: ["en", "nl"] } },
}));
vi.mock("@/composables/userPreferences", () => ({
  setUserPreferences: mocks.setUserPreferences,
}));
vi.mock("vue-sonner", () => ({ toast: mocks.toast }));

const SelectStub = {
  name: "Select",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template: '<div data-testid="select" :data-value="modelValue"><slot /></div>',
};
const SelectItemStub = {
  props: ["value"],
  template: '<div data-testid="option" :data-value="value" />',
};
const passthrough = { template: "<div><slot /></div>" };

enableAutoUnmount(afterEach);

function mountCard() {
  return mount(ThemeLanguageCard, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        Select: SelectStub,
        SelectTrigger: passthrough,
        SelectValue: true,
        SelectContent: passthrough,
        SelectItem: SelectItemStub,
        Spinner: true,
      },
    },
  });
}

const optionsOf = (select: ReturnType<ReturnType<typeof mountCard>["get"]>) =>
  select
    .findAll('[data-testid="option"]')
    .map((o) => o.attributes("data-value"));

describe("ThemeLanguageCard with the home theme and language", () => {
  let reload: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("offers the home choices in place of auto/light/dark and the locales", () => {
    const wrapper = mountCard();

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(0);
    const [theme, language] = wrapper.findAll('[data-testid="select"]');
    expect(optionsOf(theme)).toEqual(["follow", "mint/dark"]);
    expect(optionsOf(language)).toEqual(["follow", "nl"]);
    expect(language.attributes("data-value")).toBe("follow");
  });

  it("saves the theme on the server, not in the preferences", async () => {
    const wrapper = mountCard();

    wrapper
      .findAllComponents(SelectStub)[0]
      .vm.$emit("update:modelValue", "mint/dark");
    await flushPromises();

    expect(mocks.saveHomeThemeEntry).toHaveBeenCalledWith("theme", "mint/dark");
    expect(mocks.setUserPreferences).not.toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it("saves the language on the server and reloads", async () => {
    const wrapper = mountCard();

    wrapper
      .findAllComponents(SelectStub)[1]
      .vm.$emit("update:modelValue", "nl");
    await flushPromises();

    expect(mocks.saveHomeLanguageEntry).toHaveBeenCalledWith("language", "nl");
    expect(mocks.setUserPreferences).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });
});
