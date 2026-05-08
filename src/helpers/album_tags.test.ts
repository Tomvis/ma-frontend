import { describe, it, expect } from "vitest";
import {
  drQuality,
  parseLabel,
  sortLabels,
  parseAlbumTags,
  DR_THRESHOLDS,
  type ParsedLabel,
} from "./album_tags";

describe("drQuality", () => {
  it("classifies boundary values correctly", () => {
    expect(drQuality(20)).toBe("excellent");
    expect(drQuality(DR_THRESHOLDS.excellent)).toBe("excellent");
    expect(drQuality(DR_THRESHOLDS.excellent - 1)).toBe("good");
    expect(drQuality(DR_THRESHOLDS.good)).toBe("good");
    expect(drQuality(DR_THRESHOLDS.good - 1)).toBe("fair");
    expect(drQuality(DR_THRESHOLDS.fair)).toBe("fair");
    expect(drQuality(DR_THRESHOLDS.fair - 1)).toBe("poor");
    expect(drQuality(0)).toBe("poor");
  });
});

describe("parseLabel", () => {
  it("recognizes flat labels", () => {
    expect(parseLabel("RECORD_OF_THE_MONTH").kind).toBe("record_of_the_month");
    expect(parseLabel("SCORE_REVISED").kind).toBe("score_revised");
    expect(parseLabel("TYMHM").kind).toBe("tymhm");
    expect(parseLabel("SITF").kind).toBe("sitf");
    expect(parseLabel("YMIO").kind).toBe("ymio");
    expect(parseLabel("LIT").kind).toBe("lit");
    expect(parseLabel("RFU").kind).toBe("rfu");
  });

  it("parses AOTY-{year}", () => {
    expect(parseLabel("AOTY-2024")).toEqual({
      raw: "AOTY-2024",
      kind: "aoty",
      year: 2024,
    });
  });

  it("parses AOTM-{year}-{month}", () => {
    expect(parseLabel("AOTM-2024-03")).toEqual({
      raw: "AOTM-2024-03",
      kind: "aotm",
      year: 2024,
      month: 3,
    });
    expect(parseLabel("AOTM-2024-3")).toEqual({
      raw: "AOTM-2024-3",
      kind: "aotm",
      year: 2024,
      month: 3,
    });
  });

  it("parses HONORABLE_MENTION-{year}", () => {
    expect(parseLabel("HONORABLE_MENTION-2023")).toEqual({
      raw: "HONORABLE_MENTION-2023",
      kind: "honorable_mention",
      year: 2023,
    });
  });

  it("falls back to unknown for unrecognized labels", () => {
    expect(parseLabel("AOTY-202").kind).toBe("unknown");
    expect(parseLabel("RANDOM_LABEL").kind).toBe("unknown");
    expect(parseLabel("").kind).toBe("unknown");
  });
});

describe("sortLabels", () => {
  it("orders by prestige: AOTY > Record of the Month > AOTM > HM > others", () => {
    const labels: ParsedLabel[] = [
      { raw: "TYMHM", kind: "tymhm" },
      { raw: "AOTM-2024-03", kind: "aotm", year: 2024, month: 3 },
      { raw: "RECORD_OF_THE_MONTH", kind: "record_of_the_month" },
      { raw: "AOTY-2024", kind: "aoty", year: 2024 },
      { raw: "HONORABLE_MENTION-2023", kind: "honorable_mention", year: 2023 },
    ];
    const sorted = sortLabels(labels).map((l) => l.kind);
    expect(sorted).toEqual([
      "aoty",
      "record_of_the_month",
      "aotm",
      "honorable_mention",
      "tymhm",
    ]);
  });

  it("descends by year within the same kind", () => {
    const labels: ParsedLabel[] = [
      { raw: "AOTY-2022", kind: "aoty", year: 2022 },
      { raw: "AOTY-2024", kind: "aoty", year: 2024 },
      { raw: "AOTY-2023", kind: "aoty", year: 2023 },
    ];
    const sorted = sortLabels(labels).map((l) => l.year);
    expect(sorted).toEqual([2024, 2023, 2022]);
  });
});

describe("parseAlbumTags", () => {
  it("returns empty result for nullish input", () => {
    expect(parseAlbumTags(undefined)).toEqual({ hasAny: false });
    expect(parseAlbumTags(null)).toEqual({ hasAny: false });
    expect(parseAlbumTags({})).toEqual({ hasAny: false });
  });

  it("surfaces DR alone", () => {
    const result = parseAlbumTags({ dr: 12 });
    expect(result.dr).toEqual({ value: 12, quality: "good" });
    expect(result.hasAny).toBe(true);
    expect(result.amg).toBeUndefined();
    expect(result.tps).toBeUndefined();
  });

  it("ignores invalid numerics", () => {
    const result = parseAlbumTags({
      dr: Number.NaN,
      sources: [
        { source: "AMG", rating: Number.POSITIVE_INFINITY },
        { source: "TPS", rating: -1 },
      ],
    });
    expect(result.dr).toBeUndefined();
    expect(result.hasAny).toBe(false);
  });

  it("rating wins over favorite when both set (mutual exclusion)", () => {
    const result = parseAlbumTags({
      sources: [{ source: "AMG", rating: 4, favorite: true }],
    });
    expect(result.amg?.rating).toBe(4);
    expect(result.amg?.favorite).toBeUndefined();
  });

  it("uses favorite when rating absent", () => {
    const result = parseAlbumTags({
      sources: [{ source: "TPS", favorite: true, types: ["TYMHM"] }],
    });
    expect(result.tps?.rating).toBeUndefined();
    expect(result.tps?.favorite).toBe(true);
  });

  it("infers author roles for a scored review (canonical / secondary / list_pick)", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          authors: ["Steel Druhm", "Dr. A.N. Grier", "Sentynel"],
        },
      ],
    });
    expect(result.amg?.authors).toEqual([
      { name: "Steel Druhm", role: "canonical" },
      { name: "Dr. A.N. Grier", role: "secondary" },
      { name: "Sentynel", role: "list_pick" },
    ]);
  });

  it("marks all authors as list_pick when no scored review exists", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "TPS",
          favorite: true,
          authors: ["Dolphin Whisperer", "Carcharodon"],
        },
      ],
    });
    expect(result.tps?.authors).toEqual([
      { name: "Dolphin Whisperer", role: "list_pick" },
      { name: "Carcharodon", role: "list_pick" },
    ]);
  });

  it("omits a source entry that carries no usable data", () => {
    const result = parseAlbumTags({
      sources: [
        { source: "AMG", types: [], labels: [], authors: [] },
        { source: "TPS", rating: 8.5, types: ["Review"] },
      ],
    });
    expect(result.amg).toBeUndefined();
    expect(result.tps?.rating).toBe(8.5);
    expect(result.hasAny).toBe(true);
  });

  it("sorts labels deterministically inside a source", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          labels: ["TYMHM", "AOTY-2024", "AOTM-2024-03"],
        },
      ],
    });
    expect(result.amg?.labels.map((l) => l.kind)).toEqual([
      "aoty",
      "aotm",
      "tymhm",
    ]);
  });

  it("attaches the correct scale per source", () => {
    const result = parseAlbumTags({
      sources: [
        { source: "AMG", rating: 4 },
        { source: "TPS", rating: 8 },
      ],
    });
    expect(result.amg?.scale).toBe(5);
    expect(result.tps?.scale).toBe(10);
  });

  it("hasAny stays false when only empty source entries are provided", () => {
    const result = parseAlbumTags({
      sources: [{ source: "AMG" }, { source: "TPS" }],
    });
    expect(result.hasAny).toBe(false);
  });
});
