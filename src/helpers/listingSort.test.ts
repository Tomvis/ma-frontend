import { describe, it, expect } from "vitest";
import { resolveSortPreference } from "./listingSort";

const SORT_KEYS = ["sort_name", "name", "year", "year_desc"];

describe("resolveSortPreference", () => {
  it("prefers a valid per-listing override above everything else", () => {
    expect(resolveSortPreference("year", "name", SORT_KEYS)).toBe("year");
  });

  it("falls back to the global default when there is no override", () => {
    expect(resolveSortPreference(undefined, "year", SORT_KEYS)).toBe("year");
  });

  it("falls back to the first sort key when neither is set", () => {
    expect(resolveSortPreference(undefined, undefined, SORT_KEYS)).toBe(
      "sort_name",
    );
  });

  it("ignores an override that is not among the listing's sort keys", () => {
    // override carried over from a sibling listing with different keys
    expect(resolveSortPreference("duration", "year", SORT_KEYS)).toBe("year");
  });

  it("ignores a global default that is not among the listing's sort keys", () => {
    expect(resolveSortPreference(undefined, "duration", SORT_KEYS)).toBe(
      "sort_name",
    );
  });

  it("ignores both invalid candidates and uses the first sort key", () => {
    expect(resolveSortPreference("nope", "also_nope", SORT_KEYS)).toBe(
      "sort_name",
    );
  });

  it("treats an empty string override as unset", () => {
    expect(resolveSortPreference("", "year", SORT_KEYS)).toBe("year");
  });
});
