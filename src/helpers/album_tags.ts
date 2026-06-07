import type {
  CriticalReception,
  ReviewLink,
  ReviewSource,
  ReviewSourceEntry,
} from "@/plugins/api/interfaces";

export const DR_THRESHOLDS = {
  excellent: 14,
  good: 10,
  fair: 7,
} as const;

export type DRQuality = "excellent" | "good" | "fair" | "poor";

// The normalized accolade categories. Dated awards (aoty / record_of_the_month /
// honorable_mention) inline their date in the display string; the rest are exact
// review-column / honor strings. "unknown" carries through any value we don't model.
export type AccoladeKind =
  | "aoty"
  | "record_of_the_month"
  | "honorable_mention"
  | "score_revised"
  | "lit"
  | "rfu"
  | "tymhm"
  | "sitf"
  | "ymio"
  | "review"
  | "unknown";

export interface ParsedAccolade {
  // the value as stored/received (3.2.0 display string, or a legacy token in transit)
  raw: string;
  kind: AccoladeKind;
  // human-readable string to render (date inlined); equals `raw` for 3.2.0 data
  display: string;
  year?: number;
  month?: number;
  // dated editorial honors get the trophy/accolade chip styling
  isAward: boolean;
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
  accolades: ParsedAccolade[];
  // labeled post links (3.3.0+); one per post, `label` mirrors an accolade string.
  // The detail view links each accolade chip (and the review score) to these.
  links: ReviewLink[];
  authors: AuthorWithRole[];
}

// `dr` is the album's primary DR, used for the badge and the big number on the
// detail card. It prefers the measured ALBUM_DYNAMIC_RANGE (server-side filter and
// sort hit the same field), and falls back to AMG's review-reported value when no
// measured one is available so older scanned albums still show *something*.
// `dr.source` distinguishes the two so the UI can label a fallback honestly.
// `amgDr` is the divergence signal: present only when both measured and AMG values
// exist *and* they disagree, so the detail view can show "AMG reported X" as a
// secondary caption. When they agree, or only one is present, this stays undefined.
export interface AlbumTags {
  dr?: { value: number; quality: DRQuality; source: "measured" | "amg" };
  amgDr?: { value: number; quality: DRQuality };
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

const ACCOLADE_PRIORITY: Record<AccoladeKind, number> = {
  aoty: 0,
  record_of_the_month: 1,
  honorable_mention: 2,
  score_revised: 3,
  lit: 4,
  rfu: 5,
  tymhm: 6,
  sitf: 7,
  ymio: 8,
  review: 9,
  unknown: 100,
};

const AWARD_KINDS = new Set<AccoladeKind>([
  "aoty",
  "record_of_the_month",
  "honorable_mention",
]);

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Exact, undated accolades — both the 3.2.0 display form and the legacy token map here.
const EXACT_ACCOLADES: Record<string, { kind: AccoladeKind; display: string }> =
  {
    Review: { kind: "review", display: "Review" },
    TYMHM: { kind: "tymhm", display: "TYMHM" },
    SITF: { kind: "sitf", display: "SITF" },
    YMIO: { kind: "ymio", display: "YMIO" },
    "Lost in Time": { kind: "lit", display: "Lost in Time" },
    LIT: { kind: "lit", display: "Lost in Time" },
    RFU: { kind: "rfu", display: "RFU" },
    "Score Revised": { kind: "score_revised", display: "Score Revised" },
    SCORE_REVISED: { kind: "score_revised", display: "Score Revised" },
    Contrite: { kind: "score_revised", display: "Score Revised" },
  };

export function formatDated(
  name: string,
  year?: number,
  month?: number,
): string {
  if (year === undefined) return name;
  if (month !== undefined && month >= 1 && month <= 12) {
    return `${name} (${MONTH_ABBR[month - 1]} ${year})`;
  }
  return `${name} (${year})`;
}

function monthFromAbbr(abbr: string): number | undefined {
  const i = MONTH_ABBR.indexOf(abbr);
  return i === -1 ? undefined : i + 1;
}

function mkAccolade(
  kind: AccoladeKind,
  display: string,
  raw: string,
  year?: number,
  month?: number,
): ParsedAccolade {
  return { raw, kind, display, year, month, isAward: AWARD_KINDS.has(kind) };
}

/**
 * Parse one accolade string into its kind + display form.
 *
 * Recognizes the 3.2.0 human-readable display strings ("Album of the Year (2024)")
 * and, defensively during the transition, the deprecated machine tokens
 * ("AOTY-2024", "RECORD_OF_THE_MONTH", …). Unrecognized values pass through as an
 * opaque display label.
 */
export function parseAccolade(raw: string): ParsedAccolade {
  const text = raw.trim();
  const exact = EXACT_ACCOLADES[text];
  if (exact) return mkAccolade(exact.kind, exact.display, raw);

  let m: RegExpExecArray | null;
  // 3.2.0 dated display strings
  if ((m = /^Album of the Year \((\d{4})\)$/.exec(text))) {
    return mkAccolade("aoty", text, raw, Number(m[1]));
  }
  if ((m = /^Record of the Month \(([A-Za-z]{3}) (\d{4})\)$/.exec(text))) {
    return mkAccolade(
      "record_of_the_month",
      text,
      raw,
      Number(m[2]),
      monthFromAbbr(m[1]),
    );
  }
  if (text === "Record of the Month") {
    return mkAccolade("record_of_the_month", text, raw);
  }
  if ((m = /^Honorable Mention \((\d{4})\)$/.exec(text))) {
    return mkAccolade("honorable_mention", text, raw, Number(m[1]));
  }

  // legacy machine tokens (folded to a display form for rendering)
  if ((m = /^AOTY-(\d{4})$/.exec(text))) {
    const year = Number(m[1]);
    return mkAccolade(
      "aoty",
      formatDated("Album of the Year", year),
      raw,
      year,
    );
  }
  if (text === "AOTY") return mkAccolade("aoty", "Album of the Year", raw);
  if ((m = /^AOTM-(\d{4})-(\d{1,2})$/.exec(text))) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    return mkAccolade(
      "record_of_the_month",
      formatDated("Record of the Month", year, month),
      raw,
      year,
      month,
    );
  }
  if (text === "AOTM" || text === "RECORD_OF_THE_MONTH") {
    return mkAccolade("record_of_the_month", "Record of the Month", raw);
  }
  if ((m = /^HONORABLE_MENTION-(\d{4})$/.exec(text))) {
    const year = Number(m[1]);
    return mkAccolade(
      "honorable_mention",
      formatDated("Honorable Mention", year),
      raw,
      year,
    );
  }
  if (text === "HONORABLE_MENTION") {
    return mkAccolade("honorable_mention", "Honorable Mention", raw);
  }

  return mkAccolade("unknown", text, raw);
}

export function sortAccolades(accolades: ParsedAccolade[]): ParsedAccolade[] {
  return [...accolades].sort((a, b) => {
    const ap = ACCOLADE_PRIORITY[a.kind];
    const bp = ACCOLADE_PRIORITY[b.kind];
    if (ap !== bp) return ap - bp;
    if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
    return (b.month ?? 0) - (a.month ?? 0);
  });
}

function dateScore(a: ParsedAccolade): number {
  return (a.year !== undefined ? 2 : 0) + (a.month !== undefined ? 1 : 0);
}

// Legacy fallback only: the deprecated types/labels triple-encode the same concept
// across two fields (e.g. type "AOTM" + labels "RECORD_OF_THE_MONTH"/"AOTM-2024-09"),
// so collapse to one accolade per kind, preferring the most-dated variant. 3.2.0 data
// is already deduped by the sender and skips this path.
function dedupeByKind(accolades: ParsedAccolade[]): ParsedAccolade[] {
  const best = new Map<AccoladeKind, ParsedAccolade>();
  const unknowns: ParsedAccolade[] = [];
  for (const a of accolades) {
    if (a.kind === "unknown") {
      unknowns.push(a);
      continue;
    }
    const cur = best.get(a.kind);
    if (!cur || dateScore(a) > dateScore(cur)) best.set(a.kind, a);
  }
  return [...best.values(), ...unknowns];
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
  let accolades: ParsedAccolade[];
  if (entry.accolades?.length) {
    accolades = sortAccolades(entry.accolades.map(parseAccolade));
  } else {
    // Transitional fallback: fold the deprecated split types/labels lists.
    const legacy = [...(entry.types ?? []), ...(entry.labels ?? [])];
    accolades = sortAccolades(dedupeByKind(legacy.map(parseAccolade)));
  }
  // Post links: prefer the 3.3.0 `links` array; fall back to a single legacy
  // review_url presented as the "Review" link during the transition.
  const links: ReviewLink[] =
    entry.links?.filter((l) => l.url) ??
    (entry.review_url ? [{ label: "Review", url: entry.review_url }] : []);
  const authors = inferAuthorRoles(entry.authors ?? [], rating !== undefined);
  const hasAny =
    rating !== undefined ||
    favorite ||
    accolades.length > 0 ||
    links.length > 0 ||
    authors.length > 0;
  if (!hasAny) return undefined;
  return {
    source: entry.source,
    scale,
    rating,
    favorite: favorite || undefined,
    accolades,
    links,
    authors,
  };
}

function buildDr<S extends "measured" | "amg">(
  value: unknown,
  source: S,
): { value: number; quality: DRQuality; source: S } | undefined {
  if (!isPositiveFinite(value)) return undefined;
  return { value, quality: drQuality(value), source };
}

function buildPlainDr(
  value: unknown,
): { value: number; quality: DRQuality } | undefined {
  if (!isPositiveFinite(value)) return undefined;
  return { value, quality: drQuality(value) };
}

export function parseAlbumTags(
  cr: CriticalReception | undefined | null,
  albumDynamicRange?: number | null,
): AlbumTags {
  const measured = buildDr(albumDynamicRange, "measured");
  const amgRaw = cr ? buildDr(cr.amg_dr, "amg") : undefined;
  // Primary DR: measured wins; fall back to AMG so older scanned albums (no audio
  // analysis yet) still surface a value in the badge.
  const dr = measured ?? amgRaw;
  // Divergence caption for the detail view: only when *both* values exist and
  // disagree on the rounded integer. If only one value exists, dr already shows
  // it and there's nothing to compare against.
  const amgDr =
    measured &&
    amgRaw &&
    Math.round(amgRaw.value) !== Math.round(measured.value)
      ? buildPlainDr(amgRaw.value)
      : undefined;
  const sources = cr?.sources ?? [];
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
    amgDr,
    amg,
    tps,
    hasAny:
      dr !== undefined ||
      amgDr !== undefined ||
      amg !== undefined ||
      tps !== undefined,
  };
}
