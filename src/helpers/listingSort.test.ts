import { describe, it, expect } from "vitest";
import { listingSortPreferenceKey, resolveSortPreference } from "./listingSort";
import { ALBUM_SORT_KEYS } from "./albumSort";

const SORT_KEYS = ["sort_name", "name", "year", "year_desc"];

// The two listings the collision regression below is about: both are itemtype
// "albums", but Listen Later prepends its own keys and so documents a different
// default. Mirrors LibraryAlbums.vue / LibraryListenLater.vue.
const LIBRARY_ALBUM_KEYS = [...ALBUM_SORT_KEYS];
const LISTEN_LATER_KEYS = [
  "listen_later_added_at_desc",
  "listen_later_added_at",
  ...ALBUM_SORT_KEYS,
];

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

describe("listingSortPreferenceKey", () => {
  it("shares one key between instances of the same listing", () => {
    // one artist's albums and another's: same itemtype, same declared keys
    expect(listingSortPreferenceKey("artistalbums", SORT_KEYS)).toBe(
      listingSortPreferenceKey("artistalbums", [...SORT_KEYS]),
    );
  });

  it("keeps different item types apart", () => {
    expect(listingSortPreferenceKey("albums", SORT_KEYS)).not.toBe(
      listingSortPreferenceKey("tracks", SORT_KEYS),
    );
  });

  it("keeps sibling listings of one item type apart by declared default", () => {
    expect(listingSortPreferenceKey("albums", LIBRARY_ALBUM_KEYS)).not.toBe(
      listingSortPreferenceKey("albums", LISTEN_LATER_KEYS),
    );
  });

  it("falls back to the bare item-type key when no sort keys are declared", () => {
    expect(listingSortPreferenceKey("albums", [])).toBe(
      "itemsListingSort.albums",
    );
  });

  it("opens Listen Later on its own default after Albums was sorted by year", () => {
    // regression: both listings are itemtype "albums", so a single global key
    // let the Albums sort decide how the untouched inbox first opened.
    const stored: Record<string, string> = {};
    const albumsKey = listingSortPreferenceKey("albums", LIBRARY_ALBUM_KEYS);
    stored[albumsKey] = "year";

    const listenLaterKey = listingSortPreferenceKey(
      "albums",
      LISTEN_LATER_KEYS,
    );
    expect(
      resolveSortPreference(
        undefined,
        stored[listenLaterKey],
        LISTEN_LATER_KEYS,
      ),
    ).toBe("listen_later_added_at_desc");
    // ...while Albums itself still remembers the year sort
    expect(
      resolveSortPreference(undefined, stored[albumsKey], LIBRARY_ALBUM_KEYS),
    ).toBe("year");
  });
});
