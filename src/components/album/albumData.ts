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
  type Track,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";

/** The album's tracks, limited to the ones in the library when asked for. */
export async function loadAlbumTracks(
  album: Album,
  inLibraryOnly = false,
): Promise<Track[]> {
  return await api.getAlbumTracks(album.item_id, album.provider, inLibraryOnly);
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
  const authors = source.authors?.length
    ? `${source.authors.join(", ")}, `
    : "";
  const byline = link ? `[${site}](${link.url})` : site;
  return `${source.review}\n\n*— ${authors}${byline}*`;
}

/**
 * The album's review: AMG's text, then TPS's (both from our own file tags),
 * then the review or description its metadata providers found.
 */
export function albumReview(album: Album): string | undefined {
  const sources = album.metadata?.critical_reception?.sources ?? [];
  for (const name of Object.keys(REVIEW_TEXT_SOURCES) as ReviewSource[]) {
    const source = sources.find((s) => s.source === name && s.review);
    if (source) return signedReview(source);
  }
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
