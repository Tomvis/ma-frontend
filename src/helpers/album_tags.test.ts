import { describe, it, expect } from "vitest";
import {
  drQuality,
  formatScore,
  parseAccolade,
  sortAccolades,
  parseAlbumTags,
  DR_THRESHOLDS,
  type ParsedAccolade,
} from "./album_tags";

describe("formatScore", () => {
  it("pads whole numbers to one decimal and leaves fractions as-is", () => {
    expect(formatScore(4)).toBe("4.0");
    expect(formatScore(10)).toBe("10.0");
    expect(formatScore(4.5)).toBe("4.5");
    expect(formatScore(8.5)).toBe("8.5");
  });
});

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

describe("parseAccolade", () => {
  it("recognizes exact 3.2.0 / column accolades", () => {
    expect(parseAccolade("Review").kind).toBe("review");
    expect(parseAccolade("TYMHM").kind).toBe("tymhm");
    expect(parseAccolade("SITF").kind).toBe("sitf");
    expect(parseAccolade("YMIO").kind).toBe("ymio");
    expect(parseAccolade("Lost in Time").kind).toBe("lit");
    expect(parseAccolade("RFU").kind).toBe("rfu");
    expect(parseAccolade("Score Revised").kind).toBe("score_revised");
  });

  it("parses dated 3.2.0 award display strings (display kept verbatim)", () => {
    expect(parseAccolade("Album of the Year (2024)")).toEqual({
      raw: "Album of the Year (2024)",
      kind: "aoty",
      display: "Album of the Year (2024)",
      year: 2024,
      month: undefined,
      isAward: true,
    });
    expect(parseAccolade("Record of the Month (Sep 2024)")).toEqual({
      raw: "Record of the Month (Sep 2024)",
      kind: "record_of_the_month",
      display: "Record of the Month (Sep 2024)",
      year: 2024,
      month: 9,
      isAward: true,
    });
    expect(parseAccolade("Honorable Mention (2023)")).toMatchObject({
      kind: "honorable_mention",
      year: 2023,
      isAward: true,
    });
    // undated Record of the Month is still an award, just without a date facet
    expect(parseAccolade("Record of the Month")).toMatchObject({
      kind: "record_of_the_month",
      year: undefined,
      isAward: true,
    });
  });

  it("flags review-column kinds as non-awards", () => {
    expect(parseAccolade("TYMHM").isAward).toBe(false);
    expect(parseAccolade("Score Revised").isAward).toBe(false);
  });

  it("still recognizes deprecated machine tokens, folded to a display form", () => {
    expect(parseAccolade("AOTY-2024")).toMatchObject({
      kind: "aoty",
      display: "Album of the Year (2024)",
      year: 2024,
    });
    expect(parseAccolade("AOTM-2024-03")).toMatchObject({
      kind: "record_of_the_month",
      display: "Record of the Month (Mar 2024)",
      year: 2024,
      month: 3,
    });
    expect(parseAccolade("RECORD_OF_THE_MONTH")).toMatchObject({
      kind: "record_of_the_month",
      display: "Record of the Month",
    });
    expect(parseAccolade("HONORABLE_MENTION-2023")).toMatchObject({
      kind: "honorable_mention",
      display: "Honorable Mention (2023)",
      year: 2023,
    });
    expect(parseAccolade("SCORE_REVISED").kind).toBe("score_revised");
    expect(parseAccolade("Contrite").kind).toBe("score_revised");
    expect(parseAccolade("LIT")).toMatchObject({
      kind: "lit",
      display: "Lost in Time",
    });
  });

  it("falls back to unknown (opaque) for unrecognized values", () => {
    expect(parseAccolade("AOTY-202").kind).toBe("unknown");
    expect(parseAccolade("Some Future Honor (2030)").kind).toBe("unknown");
    expect(parseAccolade("").kind).toBe("unknown");
    // an unknown value is rendered verbatim
    expect(parseAccolade("Weird Thing").display).toBe("Weird Thing");
  });
});

describe("sortAccolades", () => {
  it("orders by prestige: awards before review-columns", () => {
    const accolades: ParsedAccolade[] = [
      parseAccolade("TYMHM"),
      parseAccolade("Score Revised"),
      parseAccolade("Record of the Month (Mar 2024)"),
      parseAccolade("Album of the Year (2024)"),
      parseAccolade("Honorable Mention (2023)"),
    ];
    expect(sortAccolades(accolades).map((a) => a.kind)).toEqual([
      "aoty",
      "record_of_the_month",
      "honorable_mention",
      "score_revised",
      "tymhm",
    ]);
  });

  it("descends by year within the same kind", () => {
    const accolades: ParsedAccolade[] = [
      parseAccolade("Album of the Year (2022)"),
      parseAccolade("Album of the Year (2024)"),
      parseAccolade("Album of the Year (2023)"),
    ];
    expect(sortAccolades(accolades).map((a) => a.year)).toEqual([
      2024, 2023, 2022,
    ]);
  });
});

describe("parseAlbumTags", () => {
  it("returns empty result for nullish input", () => {
    expect(parseAlbumTags(undefined)).toEqual({ hasAny: false });
    expect(parseAlbumTags(null)).toEqual({ hasAny: false });
    expect(parseAlbumTags({})).toEqual({ hasAny: false });
  });

  it("surfaces measured DR (album-scope dynamic_range) as the primary value", () => {
    const result = parseAlbumTags(undefined, 12);
    expect(result.dr).toEqual({
      value: 12,
      quality: "good",
      source: "measured",
    });
    expect(result.amgDr).toBeUndefined();
    expect(result.hasAny).toBe(true);
  });

  it("falls back to AMG DR when no measured value is available", () => {
    const result = parseAlbumTags({ amg_dr: 8 });
    expect(result.dr).toEqual({ value: 8, quality: "fair", source: "amg" });
    expect(result.amgDr).toBeUndefined();
  });

  it("hides AMG DR caption when measured and AMG agree on the rounded integer", () => {
    const result = parseAlbumTags({ amg_dr: 12.4 }, 12);
    expect(result.dr?.source).toBe("measured");
    expect(result.dr?.value).toBe(12);
    expect(result.amgDr).toBeUndefined();
  });

  it("surfaces AMG DR caption only when measured and AMG diverge", () => {
    const result = parseAlbumTags({ amg_dr: 14 }, 9);
    expect(result.dr).toEqual({
      value: 9,
      quality: "fair",
      source: "measured",
    });
    expect(result.amgDr).toEqual({ value: 14, quality: "excellent" });
  });

  it("ignores invalid numerics on both DR inputs", () => {
    const result = parseAlbumTags(
      {
        amg_dr: Number.NaN,
        sources: [
          { source: "AMG", rating: Number.POSITIVE_INFINITY },
          { source: "TPS", rating: -1 },
        ],
      },
      Number.POSITIVE_INFINITY,
    );
    expect(result.dr).toBeUndefined();
    expect(result.amgDr).toBeUndefined();
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
      sources: [{ source: "TPS", favorite: true, accolades: ["TYMHM"] }],
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
        { source: "AMG", accolades: [], authors: [] },
        { source: "TPS", rating: 8.5, accolades: ["Review"] },
      ],
    });
    expect(result.amg).toBeUndefined();
    expect(result.tps?.rating).toBe(8.5);
    expect(result.hasAny).toBe(true);
  });

  it("sorts accolades deterministically inside a source", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          accolades: [
            "TYMHM",
            "Album of the Year (2024)",
            "Record of the Month (Mar 2024)",
          ],
        },
      ],
    });
    expect(result.amg?.accolades.map((a) => a.kind)).toEqual([
      "aoty",
      "record_of_the_month",
      "tymhm",
    ]);
  });

  it("folds & dedupes deprecated types/labels when accolades is absent", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          // triple-encodes Record of the Month across both fields
          types: ["Review", "AOTM"],
          labels: ["AOTY-2024", "RECORD_OF_THE_MONTH", "AOTM-2024-09"],
        },
      ],
    });
    const accolades = result.amg?.accolades ?? [];
    expect(accolades.map((a) => a.kind)).toEqual([
      "aoty",
      "record_of_the_month",
      "review",
    ]);
    // the dated variant wins the dedupe
    expect(
      accolades.find((a) => a.kind === "record_of_the_month")?.display,
    ).toBe("Record of the Month (Sep 2024)");
  });

  it("exposes 3.3.0 post links on the source (one entry per post)", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          accolades: ["Review", "Album of the Year (2024)"],
          links: [
            { label: "Review", url: "https://amg/review/" },
            { label: "Album of the Year (2024)", url: "https://amg/a/" },
            { label: "Album of the Year (2024)", url: "https://amg/b/" },
          ],
        },
      ],
    });
    expect(result.amg?.links).toEqual([
      { label: "Review", url: "https://amg/review/" },
      { label: "Album of the Year (2024)", url: "https://amg/a/" },
      { label: "Album of the Year (2024)", url: "https://amg/b/" },
    ]);
  });

  it("falls back to a single Review link from a legacy review_url", () => {
    const result = parseAlbumTags({
      sources: [{ source: "AMG", rating: 4, review_url: "https://amg/old/" }],
    });
    expect(result.amg?.links).toEqual([
      { label: "Review", url: "https://amg/old/" },
    ]);
  });

  it("prefers the links array over a legacy review_url", () => {
    const result = parseAlbumTags({
      sources: [
        {
          source: "AMG",
          rating: 4,
          links: [{ label: "Review", url: "https://amg/new/" }],
          review_url: "https://amg/old/",
        },
      ],
    });
    expect(result.amg?.links?.map((l) => l.url)).toEqual(["https://amg/new/"]);
  });

  it("has no links when neither links nor review_url are present", () => {
    const result = parseAlbumTags({
      sources: [{ source: "AMG", rating: 4 }],
    });
    expect(result.amg?.links).toEqual([]);
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
