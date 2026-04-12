const API_KEY = process.env.LASTFM_API_KEY!;
// Docs: http://ws.audioscrobbler.com/2.0/ — use HTTPS
const BASE = "https://ws.audioscrobbler.com/2.0/";

export interface LastfmTrack {
  name: string;
  artist: { name: string };
  match: number;
  // Last.fm returns image as array of { "#text": url, size: "small"|"medium"|"large"|"extralarge" }
  // "#text" is often "" (empty) — always check before using
  image: { "#text": string; size: string }[];
  url: string;
}

/** Pick the best available image URL from a Last.fm image array, skipping empty strings */
export function bestImage(images: { "#text": string; size: string }[], preferSize = "medium"): string | null {
  const preferred = images.find((i) => i.size === preferSize && i["#text"]);
  if (preferred) return preferred["#text"];
  const fallback = images.find((i) => i["#text"]);
  return fallback?.["#text"] ?? null;
}

function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export async function getSimilarTracks(
  artist: string,
  track: string,
  limit = 5
): Promise<LastfmTrack[]> {
  const res = await fetch(
    buildUrl({ method: "track.getSimilar", artist, track, limit: String(limit) }),
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  if (data.error) return [];
  const tracks = data.similartracks?.track ?? [];
  // API returns a single object (not array) when there's exactly 1 result
  return Array.isArray(tracks) ? tracks : [tracks];
}

export async function getSimilarArtists(
  artist: string,
  limit = 5
): Promise<{ name: string; match: number }[]> {
  const res = await fetch(
    buildUrl({ method: "artist.getSimilar", artist, limit: String(limit) }),
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  if (data.error) return [];
  const artists = data.similarartists?.artist ?? [];
  return Array.isArray(artists) ? artists : [artists];
}

export async function getArtistTopTracks(
  artist: string,
  limit = 3
): Promise<LastfmTrack[]> {
  const res = await fetch(
    buildUrl({ method: "artist.getTopTracks", artist, limit: String(limit) }),
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  if (data.error) return [];
  const tracks = data.toptracks?.track ?? [];
  const arr = Array.isArray(tracks) ? tracks : [tracks];
  // artist.getTopTracks doesn't nest artist inside each track — add it from the param
  return arr.map((t: any) => ({
    name: t.name,
    artist: { name: artist },
    match: 0,
    image: t.image ?? [],
    url: t.url,
  }));
}

export async function getTopTags(
  artist: string,
  track: string,
  limit = 4
): Promise<string[]> {
  const res = await fetch(
    buildUrl({ method: "track.getTopTags", artist, track }),
    { next: { revalidate: 86400 } }
  );
  const data = await res.json();
  if (data.error) return [];
  const tags: { name: string; count: number }[] = data.toptags?.tag ?? [];
  const arr = Array.isArray(tags) ? tags : [tags];
  // Last.fm tags include a lot of user-generated noise — filter aggressively
  const junk = new Set([
    "seen live", "albums i own", "favorites", "favourite", "love",
    "awesome", "cool", "good", "great", "beautiful", "amazing",
    "check out", "spotify", "youtube", "via", "the",
  ]);
  return arr
    .filter((t) => t.count > 10 && t.name.length > 2 && !junk.has(t.name.toLowerCase()))
    .slice(0, limit)
    .map((t) => t.name.toLowerCase());
}
