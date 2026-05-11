import type { CriticalReception } from "@/plugins/api/interfaces";

// Static fixtures used by tests. The canonical (measured) DR lives on
// MediaItemMetadata.dynamic_range; CriticalReception only carries AMG's
// review-reported DR (amg_dr) and per-source review entries.

export const FIXTURE_FULL: CriticalReception = {
  amg_dr: 12,
  sources: [
    {
      source: "AMG",
      rating: 4,
      types: ["Review", "AOTY"],
      labels: ["AOTY-2024", "RECORD_OF_THE_MONTH"],
      authors: ["Steel Druhm", "Dr. A.N. Grier"],
    },
    {
      source: "TPS",
      favorite: true,
      types: ["AOTM", "Review"],
      labels: ["AOTM-2024-03", "SCORE_REVISED"],
      authors: ["Dolphin Whisperer"],
    },
  ],
};

export const FIXTURE_AMG_ONLY: CriticalReception = {
  sources: [
    {
      source: "AMG",
      rating: 3.5,
      types: ["Review"],
      labels: [],
      authors: ["Carcharodon"],
    },
  ],
};

export const FIXTURE_AMG_DR_ONLY: CriticalReception = {
  amg_dr: 8,
};
