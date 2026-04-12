const API_KEY = process.env.LASTFM_API_KEY!;
const BASE = "https://ws.audioscrobbler.com/2.0";

export interface LastfmTrack {
  name: string;
  artist: { name: string };
  match: number;
  image: { "#text": string; size: string }[];
  url: string;
}

export async function getSimilarTracks(
  artist: string,
  track: string,
  limit = 5
): Promise<LastfmTrack[]> {
  const url = new URL(BASE);
  url.searchParams.set("method", "track.getSimilar");
  url.searchParams.set("artist", artist);
  url.searchParams.set("track", track);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = await res.json();
  return data.similartracks?.track ?? [];
}

export async function getSimilarArtists(
  artist: string,
  limit = 5
): Promise<{ name: string; match: number }[]> {
  const url = new URL(BASE);
  url.searchParams.set("method", "artist.getSimilar");
  url.searchParams.set("artist", artist);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = await res.json();
  return data.similarartists?.artist ?? [];
}

export async function getArtistTopTracks(
  artist: string,
  limit = 3
): Promise<LastfmTrack[]> {
  const url = new URL(BASE);
  url.searchParams.set("method", "artist.getTopTracks");
  url.searchParams.set("artist", artist);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = await res.json();
  const tracks = data.toptracks?.track ?? [];
  return tracks.map((t: any) => ({
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
  const url = new URL(BASE);
  url.searchParams.set("method", "track.getTopTags");
  url.searchParams.set("artist", artist);
  url.searchParams.set("track", track);
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  const data = await res.json();
  const tags: { name: string; count: number }[] = data.toptags?.tag ?? [];
  // Filter out junk tags (very short, all-caps, or generic ones)
  const junk = new Set(["seen live", "albums i own", "favorites", "favourite", "love", "awesome", "cool", "good"]);
  return tags
    .filter((t) => t.count > 10 && t.name.length > 2 && !junk.has(t.name.toLowerCase()))
    .slice(0, limit)
    .map((t) => t.name.toLowerCase());
}
