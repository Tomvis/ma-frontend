/**
 * The full set of album sort keys offered by the library Albums view. Shared so
 * the Listen Later view (which prepends its own listen-later keys) stays in
 * lockstep — adding an album sort key here surfaces it in both views. Order is
 * significant: sortKeys[0] is the default sort.
 */
export const ALBUM_SORT_KEYS = [
  "name",
  "name_desc",
  "sort_name",
  "sort_name_desc",
  "year",
  "year_desc",
  "timestamp_added",
  "timestamp_added_desc",
  "last_played",
  "last_played_desc",
  "play_count",
  "play_count_desc",
  "artist_name",
  "artist_name_desc",
  "dr",
  "dr_desc",
  "amg_rating",
  "amg_rating_desc",
  "tps_rating",
  "tps_rating_desc",
] as const;
