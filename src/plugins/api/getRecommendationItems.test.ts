import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "./index";

describe("getRecommendationItems", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits providers when not given", async () => {
    const spy = vi.spyOn(api, "sendCommand").mockResolvedValue([]);
    await api.getRecommendationItems("library", "recently_played");

    expect(spy).toHaveBeenCalledWith(
      "music/recommendations/items",
      { provider: "library", item_id: "recently_played", providers: undefined },
      { suppressGlobalError: true },
    );
  });

  it("sends the given provider instance ids", async () => {
    const spy = vi.spyOn(api, "sendCommand").mockResolvedValue([]);
    await api.getRecommendationItems("library", "recently_played", [
      "spotify--abc",
    ]);

    expect(spy).toHaveBeenCalledWith(
      "music/recommendations/items",
      {
        provider: "library",
        item_id: "recently_played",
        providers: ["spotify--abc"],
      },
      { suppressGlobalError: true },
    );
  });

  it("sends an explicit empty list to filter out every provider", async () => {
    const spy = vi.spyOn(api, "sendCommand").mockResolvedValue([]);
    await api.getRecommendationItems("library", "recently_played", []);

    expect(spy).toHaveBeenCalledWith(
      "music/recommendations/items",
      { provider: "library", item_id: "recently_played", providers: [] },
      { suppressGlobalError: true },
    );
  });
});

describe("isDigarrRecommendation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("knows the items a digarr row returned, and only those", async () => {
    vi.spyOn(api, "sendCommand").mockResolvedValue([
      { uri: "ytmusic://track/a" },
    ]);
    await api.getRecommendationItems("digarr--x", "up_next_songs");
    vi.spyOn(api, "sendCommand").mockResolvedValue([
      { uri: "ytmusic://track/b" },
    ]);
    await api.getRecommendationItems("library", "recently_played");

    expect(api.isDigarrRecommendation("ytmusic://track/a")).toBe(true);
    expect(api.isDigarrRecommendation("ytmusic://track/b")).toBe(false);
  });

  it("forgets a song once its row refetches without it", async () => {
    vi.spyOn(api, "sendCommand").mockResolvedValue([
      { uri: "ytmusic://track/c" },
    ]);
    await api.getRecommendationItems("digarr--y", "up_next_songs");
    vi.spyOn(api, "sendCommand").mockResolvedValue([]);
    await api.getRecommendationItems("digarr--y", "up_next_songs");

    expect(api.isDigarrRecommendation("ytmusic://track/c")).toBe(false);
  });
});
