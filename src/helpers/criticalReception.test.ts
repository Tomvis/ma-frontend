import { describe, it, expect } from "vitest";
import type { LoadDataParams } from "@/components/ItemsListing.vue";
import { buildCriticalReceptionFilter } from "./criticalReception";

const params = (over: Partial<LoadDataParams>): LoadDataParams =>
  over as LoadDataParams;

describe("buildCriticalReceptionFilter", () => {
  it("returns undefined when no critical-reception filter is active", () => {
    expect(buildCriticalReceptionFilter(params({}))).toBeUndefined();
    // a non-CR filter (e.g. only the match mode) must not produce a filter
    expect(
      buildCriticalReceptionFilter(params({ criticalReceptionMatch: "any" })),
    ).toBeUndefined();
  });

  it("maps DR / AMG / TPS list filters onto the wire shape", () => {
    expect(
      buildCriticalReceptionFilter(
        params({
          drBuckets: ["excellent"],
          amgRatings: [5],
          amgFavorite: true,
          amgAccolades: ["aoty", "tymhm", "ymio"],
          tpsRatings: [9],
          tpsAccolades: ["record_of_the_month"],
          tpsUntagged: true,
        }),
      ),
    ).toEqual({
      dr_buckets: ["excellent"],
      amg_ratings: [5],
      amg_favorite: true,
      amg_accolades: ["aoty", "tymhm", "ymio"],
      tps_ratings: [9],
      tps_accolades: ["record_of_the_month"],
      tps_untagged: true,
    });
  });

  it("emits match mode only when ANY is selected", () => {
    expect(
      buildCriticalReceptionFilter(
        params({ amgUntagged: true, criticalReceptionMatch: "any" }),
      ),
    ).toEqual({ amg_untagged: true, critical_reception_match: "any" });

    expect(
      buildCriticalReceptionFilter(
        params({ amgUntagged: true, criticalReceptionMatch: "all" }),
      ),
    ).toEqual({ amg_untagged: true });
  });
});
