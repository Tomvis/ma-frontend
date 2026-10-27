import {
  artistAlbumsBySource,
  sortReleasesNewestFirst,
} from "@/components/artist/artistData";
import type { RowSource } from "@/components/details/rowRegistry";
import { getImageThumbForItem } from "@/helpers/utils";
import { api } from "@/plugins/api";
import {
  ImageType,
  type Album,
  type Artist,
  type ReviewSource,
  type ReviewSourceEntry,
  type SortDirection,
  type SortField,
  type Track,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";

/** The album's tracks, limited to the ones in the library when asked for. */
export async function loadAlbumTracks(
  album: Album,
  inLibraryOnly = false,
  search?: string,
  limit?: number,
  offset?: number,
  sortField?: SortField,
  sortDirection?: SortDirection,
  favoriteOnly = false,
): Promise<Track[]> {
  return await api.getAlbumTracks(
    album.item_id,
    album.provider,
    inLibraryOnly,
    search,
    limit,
    offset,
    sortField,
    sortDirection,
    favoriteOnly || undefined,
  );
}

/** The same album elsewhere: other editions, and the copies other sources hold. */
export async function loadAlbumVersions(album: Album): Promise<Album[]> {
  return await api.getAlbumVersions(album.item_id, album.provider);
}

/**
 * The album artist's other releases from the given source, newest first.
 *
 * The album on screen is left out, by uri and by name: the artist's releases
 * are listed on whichever provider `source` selects, so the same album can come
 * back under an id this page has never seen.
 */
export async function loadArtistReleases(
  album: Album,
  source: RowSource,
): Promise<Album[]> {
  const artist = album.artists[0];
  if (!artist) return [];
  const releases = await artistAlbumsBySource(artist, source);
  const name = album.name.toLowerCase();
  return sortReleasesNewestFirst(
    releases.filter(
      (release) =>
        release.uri !== album.uri && release.name.toLowerCase() !== name,
    ),
  );
}

/** Each review source's site-name key, in the order its text is preferred. */
const REVIEW_TEXT_SOURCES: Record<ReviewSource, string> = {
  AMG: "source.amg",
  TPS: "source.tps",
};

/** A source's review text, signed with its authors and a link to the post. */
function signedReview(source: ReviewSourceEntry): string {
  const link =
    source.links?.find((l) => l.label === "Review") ?? source.links?.[0];
  const site = $t(REVIEW_TEXT_SOURCES[source.source]);
  // AMG's founder writes as "Angry Metal Guy": don't sign his reviews twice
  const names = (source.authors ?? []).filter((a) => a !== site);
  const authors = names.length ? `${names.join(", ")}, ` : "";
  const byline = link ? `[${site}](${link.url})` : site;
  return `${source.review}\n\n*— ${authors}${byline}*`;
}

/**
 * Post types whose text a review source carries, best first (MUSIC-182): a review,
 * then AMG's TYMHM, TPS's RFU, AMG's YMIO, TPS's LIT. Text without a type predates
 * the type tag and is a review or a TYMHM/LIT write-up; it ranks as a review.
 */
const REVIEW_TYPE_RANK = ["review", "tymhm", "rfu", "ymio", "lit"];

function reviewRank(source: ReviewSourceEntry): number {
  const rank = REVIEW_TYPE_RANK.indexOf(source.review_type ?? "review");
  return rank < 0 ? REVIEW_TYPE_RANK.length : rank;
}

/**
 * The album's review: the best-ranked AMG/TPS text (from our own file tags), AMG's
 * first among equals, then the review or description its metadata providers found.
 */
export function albumReview(album: Album): string | undefined {
  const sources = album.metadata?.critical_reception?.sources ?? [];
  const names = Object.keys(REVIEW_TEXT_SOURCES) as ReviewSource[];
  const best = sources
    .filter((s) => names.includes(s.source) && s.review)
    .sort(
      (a, b) =>
        reviewRank(a) - reviewRank(b) ||
        names.indexOf(a.source) - names.indexOf(b.source),
    )[0];
  if (best) return signedReview(best);
  return album.metadata?.review || album.metadata?.description || undefined;
}

/** The total playing time of the tracks, in seconds. */
export function albumDuration(tracks: Track[]): number {
  return tracks.reduce((total, track) => total + (track.duration || 0), 0);
}

export interface AlbumBackdrop {
  // undefined when neither the album nor its artist has any artwork
  url?: string;
  // the cover standing in for missing wide art, which the hero blurs so it
  // reads as colour instead of a second copy of the cover beside it
  blurred: boolean;
}

/**
 * The artwork behind the album hero: wide art (fanart, then landscape) of the
 * album or the given artist, else the cover to blur. No size is passed, so the
 * server serves the original image.
 */
export function albumBackdrop(album: Album, artist?: Artist): AlbumBackdrop {
  const wide =
    getImageThumbForItem(album, ImageType.FANART) ||
    getImageThumbForItem(album, ImageType.LANDSCAPE) ||
    getImageThumbForItem(artist, ImageType.FANART) ||
    getImageThumbForItem(artist, ImageType.LANDSCAPE);
  if (wide) return { url: wide, blurred: false };
  return { url: getImageThumbForItem(album, ImageType.THUMB), blurred: true };
}
