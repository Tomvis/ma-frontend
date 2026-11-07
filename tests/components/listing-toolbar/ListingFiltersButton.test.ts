import ListingFiltersButton from "@/components/listing-toolbar/ListingFiltersButton.vue";
import { flushPromises, mount } from "@vue/test-utils";
import type { ListingDialogFilter } from "@/helpers/listing_filters";
import { describe, expect, it, vi } from "vitest";

vi.mock("vue-i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("ListingFiltersButton", () => {
  it("names the panel it opens", async () => {
    const button = mount(ListingFiltersButton, {
      attachTo: document.body,
      props: { filters: [], activeCount: 0, compact: false },
      global: { mocks: { $t: (key: string) => key } },
    });

    await button.find("button").trigger("click");
    await flushPromises();

    expect(
      document.body
        .querySelector('[role="dialog"]')
        ?.getAttribute("aria-label"),
    ).toBe("listing_filters.title");
    button.unmount();
  });

  // fork: the review filters field moves on to their own dialog
  it("closes before a field opens its own dialog", async () => {
    const open = vi.fn();
    const filter: ListingDialogFilter = {
      kind: "dialog",
      id: "reviews",
      label: "Reviews",
      summary: "AMG",
      activeCount: 1,
      open,
    };
    const button = mount(ListingFiltersButton, {
      attachTo: document.body,
      props: { filters: [filter], activeCount: 1, compact: false },
      global: { mocks: { $t: (key: string) => key } },
    });

    await button.find("button").trigger("click");
    await flushPromises();
    // inside the panel; the trigger names a popup too
    const field = document.body.querySelector<HTMLButtonElement>(
      '[role="dialog"] button[aria-haspopup="dialog"]',
    );
    expect(field?.textContent).toContain("AMG");

    field?.click();
    await flushPromises();

    expect(open).toHaveBeenCalledOnce();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    button.unmount();
  });
});
