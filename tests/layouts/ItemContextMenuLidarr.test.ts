/**
 * "Add to Lidarr" on a streaming track wants just that track of its album
 * (MUSIC-76); on a streaming album it monitors the album, as before.
 */
import { showContextMenuForMediaItem } from "@/layouts/default/ItemContextMenu.vue";
import { ProviderType, type Track } from "@/plugins/api/interfaces";
import type { ContextMenuDialogEvent } from "@/plugins/eventbus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { album } from "../fixtures/album";
import { providerInstance } from "../fixtures/providerInstance";
import { providerMapping } from "../fixtures/providerMapping";
import { BUILTIN_ROLE_SCOPES, scopeChecker } from "../fixtures/scopes";
import { track } from "../fixtures/track";

const { apiMock, emittedMenus, hasScope, storeMock, toastMock } = vi.hoisted(
  () => ({
    emittedMenus: [] as ContextMenuDialogEvent[],
    apiMock: {
      getItem: vi.fn(),
      getLibraryItem: vi.fn(),
      getProvider: vi.fn(),
      getCoreConfigValue: vi.fn(),
      lidarrAddAlbum: vi.fn(),
      lidarrAddTrack: vi.fn(),
      signalEvent: vi.fn(),
      playMedia: vi.fn(),
      providers: {} as Record<string, unknown>,
      players: {},
    },
    hasScope: vi.fn(),
    storeMock: {
      activePlayer: undefined,
      activePlayerId: undefined,
      enabledPlugins: new Set<string>(),
    },
    toastMock: {
      loading: vi.fn(() => "toast-1"),
      success: vi.fn(),
      dismiss: vi.fn(),
      error: vi.fn(),
    },
  }),
);

vi.mock("@/plugins/api", () => ({ default: apiMock, api: apiMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));
vi.mock("@/plugins/auth", () => ({ authManager: { hasScope } }));
vi.mock("vue-sonner", () => ({ toast: toastMock }));
vi.mock("@/plugins/eventbus", () => ({
  eventbus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn((_type: string, payload: ContextMenuDialogEvent) => {
      if (payload?.items) emittedMenus.push(payload);
    }),
  },
}));
vi.mock("@/plugins/i18n", () => ({ $t: (key: string) => key }));

const tidalMapping = providerMapping({
  item_id: "5",
  provider_domain: "tidal",
  provider_instance: "tidal--1",
});

function tidalTrack(overrides: Partial<Track> = {}): Track {
  return track({
    item_id: "5",
    provider: "tidal--1",
    name: "Bleak",
    provider_mappings: [tidalMapping],
    album: album({ item_id: "77", provider: "tidal--1" }),
    ...overrides,
  });
}

async function menuFor(item: Track) {
  await showContextMenuForMediaItem(item, undefined, 0, 0, true, true);
  return emittedMenus[0]?.items ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  emittedMenus.length = 0;
  apiMock.providers = {
    "tidal--1": providerInstance({
      domain: "tidal",
      instance_id: "tidal--1",
      is_streaming_provider: true,
    }),
    "lidarr--1": providerInstance({
      domain: "lidarr",
      instance_id: "lidarr--1",
      type: ProviderType.PLUGIN,
    }),
  };
  hasScope.mockImplementation(scopeChecker(BUILTIN_ROLE_SCOPES.user));
  // not in the library: the menu works off the streaming item itself
  apiMock.getLibraryItem.mockResolvedValue(undefined);
  apiMock.lidarrAddTrack.mockResolvedValue({ already_wanted: false });
});

describe("Add to Lidarr on a track", () => {
  it("wants the track by its uri", async () => {
    const item = tidalTrack();
    const entry = (await menuFor(item)).find(
      (e) => e.label === "add_to_lidarr",
    );

    await entry?.action?.();

    expect(apiMock.lidarrAddTrack).toHaveBeenCalledWith(item.uri);
    expect(apiMock.lidarrAddAlbum).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("lidarr.track_added", {
      id: "toast-1",
    });
  });

  it("says when the track was already wanted", async () => {
    apiMock.lidarrAddTrack.mockResolvedValue({ already_wanted: true });
    const entry = (await menuFor(tidalTrack())).find(
      (e) => e.label === "add_to_lidarr",
    );

    await entry?.action?.();

    expect(toastMock.success).toHaveBeenCalledWith(
      "lidarr.track_already_wanted",
      { id: "toast-1" },
    );
  });

  it("is not offered for a track without an album", async () => {
    const labels = (await menuFor(tidalTrack({ album: null }))).map(
      (e) => e.label,
    );

    expect(labels).not.toContain("add_to_lidarr");
  });

  it("is not offered without a loaded Lidarr provider", async () => {
    delete apiMock.providers["lidarr--1"];

    const labels = (await menuFor(tidalTrack())).map((e) => e.label);

    expect(labels).not.toContain("add_to_lidarr");
  });
});
