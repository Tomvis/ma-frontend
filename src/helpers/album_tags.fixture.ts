import type { CriticalReception } from "@/plugins/api/interfaces";

// Static fixtures used by tests and as a temporary dev seed inside
// useAlbumTags() until the backend is wired up.
// TODO: remove the dev-seed import from useAlbumTags.ts once the backend
// populates `metadata.critical_reception`. The fixtures themselves can stay
// as a test-only artifact.

export const FIXTURE_FULL: CriticalReception = {
  dr: 12,
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

export const FIXTURE_DR_ONLY: CriticalReception = {
  dr: 8,
};
