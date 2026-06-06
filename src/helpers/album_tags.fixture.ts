import type { CriticalReception } from "@/plugins/api/interfaces";

// Static fixtures used by tests. The canonical (measured) DR lives on
// MediaItemMetadata.dynamic_range; CriticalReception only carries AMG's
// review-reported DR (amg_dr) and per-source review entries. Accolades use the
// 3.2.0 merged display-string shape.

export const FIXTURE_FULL: CriticalReception = {
  amg_dr: 12,
  sources: [
    {
      source: "AMG",
      rating: 4,
      accolades: ["Review", "Album of the Year (2024)", "Record of the Month"],
      authors: ["Steel Druhm", "Dr. A.N. Grier"],
    },
    {
      source: "TPS",
      favorite: true,
      accolades: ["Review", "Record of the Month (Mar 2024)", "Score Revised"],
      authors: ["Dolphin Whisperer"],
    },
  ],
};

export const FIXTURE_AMG_ONLY: CriticalReception = {
  sources: [
    {
      source: "AMG",
      rating: 3.5,
      accolades: ["Review"],
      authors: ["Carcharodon"],
    },
  ],
};

export const FIXTURE_AMG_DR_ONLY: CriticalReception = {
  amg_dr: 8,
};
