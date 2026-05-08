import type {
  CriticalReception,
  ReviewSource,
  ReviewSourceEntry,
} from "@/plugins/api/interfaces";

export const DR_THRESHOLDS = {
  excellent: 14,
  good: 10,
  fair: 7,
} as const;

export type DRQuality = "excellent" | "good" | "fair" | "poor";

export type LabelKind =
  | "record_of_the_month"
  | "aoty"
  | "aotm"
  | "honorable_mention"
  | "score_revised"
  | "tymhm"
  | "sitf"
  | "ymio"
  | "lit"
  | "rfu"
  | "unknown";

export interface ParsedLabel {
  raw: string;
  kind: LabelKind;
  year?: number;
  month?: number;
}

export type AuthorRole = "canonical" | "secondary" | "list_pick";

export interface AuthorWithRole {
  name: string;
  role: AuthorRole;
}

export interface SourceTags {
  source: ReviewSource;
  scale: 5 | 10;
  rating?: number;
  favorite?: boolean;
  types: string[];
  labels: ParsedLabel[];
  authors: AuthorWithRole[];
}

export interface AlbumTags {
  dr?: { value: number; quality: DRQuality };
  amg?: SourceTags;
  tps?: SourceTags;
  hasAny: boolean;
}

export function drQuality(value: number): DRQuality {
  if (value >= DR_THRESHOLDS.excellent) return "excellent";
  if (value >= DR_THRESHOLDS.good) return "good";
  if (value >= DR_THRESHOLDS.fair) return "fair";
  return "poor";
}

const LABEL_PRIORITY: Record<LabelKind, number> = {
  aoty: 0,
  record_of_the_month: 1,
  aotm: 2,
  honorable_mention: 3,
  score_revised: 4,
  lit: 5,
  rfu: 6,
  tymhm: 7,
  sitf: 8,
  ymio: 9,
  unknown: 100,
};

export function parseLabel(raw: string): ParsedLabel {
  switch (raw) {
    case "RECORD_OF_THE_MONTH":
      return { raw, kind: "record_of_the_month" };
    case "SCORE_REVISED":
      return { raw, kind: "score_revised" };
    case "TYMHM":
      return { raw, kind: "tymhm" };
    case "SITF":
      return { raw, kind: "sitf" };
    case "YMIO":
      return { raw, kind: "ymio" };
    case "LIT":
      return { raw, kind: "lit" };
    case "RFU":
      return { raw, kind: "rfu" };
  }
  const aoty = /^AOTY-(\d{4})$/.exec(raw);
  if (aoty) return { raw, kind: "aoty", year: Number(aoty[1]) };
  const aotm = /^AOTM-(\d{4})-(\d{1,2})$/.exec(raw);
  if (aotm) {
    return {
      raw,
      kind: "aotm",
      year: Number(aotm[1]),
      month: Number(aotm[2]),
    };
  }
  const hm = /^HONORABLE_MENTION-(\d{4})$/.exec(raw);
  if (hm) return { raw, kind: "honorable_mention", year: Number(hm[1]) };
  return { raw, kind: "unknown" };
}

export function sortLabels(labels: ParsedLabel[]): ParsedLabel[] {
  return [...labels].sort((a, b) => {
    const ap = LABEL_PRIORITY[a.kind];
    const bp = LABEL_PRIORITY[b.kind];
    if (ap !== bp) return ap - bp;
    if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
    return (b.month ?? 0) - (a.month ?? 0);
  });
}

function inferAuthorRoles(
  names: string[],
  hasScored: boolean,
): AuthorWithRole[] {
  return names.map((name, idx) => {
    if (!hasScored) return { name, role: "list_pick" };
    if (idx === 0) return { name, role: "canonical" };
    if (idx === 1) return { name, role: "secondary" };
    return { name, role: "list_pick" };
  });
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function parseSource(entry: ReviewSourceEntry): SourceTags | undefined {
  const scale: 5 | 10 = entry.source === "AMG" ? 5 : 10;
  // Rating wins over favorite when both are set (more specific signal).
  const rating = isPositiveFinite(entry.rating) ? entry.rating : undefined;
  const favorite = rating === undefined && entry.favorite === true;
  const types = entry.types ?? [];
  const labels = sortLabels((entry.labels ?? []).map(parseLabel));
  const authors = inferAuthorRoles(entry.authors ?? [], rating !== undefined);
  const hasAny =
    rating !== undefined ||
    favorite ||
    types.length > 0 ||
    labels.length > 0 ||
    authors.length > 0;
  if (!hasAny) return undefined;
  return {
    source: entry.source,
    scale,
    rating,
    favorite: favorite || undefined,
    types,
    labels,
    authors,
  };
}

export function parseAlbumTags(
  input: CriticalReception | undefined | null,
): AlbumTags {
  if (!input) return { hasAny: false };
  let dr: AlbumTags["dr"];
  if (isPositiveFinite(input.dr)) {
    dr = { value: input.dr, quality: drQuality(input.dr) };
  }
  const sources = input.sources ?? [];
  const amg = sources
    .filter((s) => s.source === "AMG")
    .map(parseSource)
    .find((s) => s !== undefined);
  const tps = sources
    .filter((s) => s.source === "TPS")
    .map(parseSource)
    .find((s) => s !== undefined);
  return {
    dr,
    amg,
    tps,
    hasAny: dr !== undefined || amg !== undefined || tps !== undefined,
  };
}
