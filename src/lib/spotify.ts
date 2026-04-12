const PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID!;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function getClientToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3500 },
  });
  const data = await res.json();
  return data.access_token;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface PlaylistTrackItem {
  added_at: string;
  added_by: { id: string };
  track: SpotifyTrack;
}

export async function getPlaylistTracks(accessToken?: string, playlistId?: string): Promise<PlaylistTrackItem[]> {
  const token = accessToken ?? await getClientToken();
  // Strip any ?si= or other query params people paste from Spotify share links
  const pid = (playlistId ?? PLAYLIST_ID).split("?")[0];
  const items: PlaylistTrackItem[] = [];
  // Spotify renamed /tracks → /items; the track object is now keyed as "item" not "track"
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${pid}/items?limit=50&fields=next,items(added_at,added_by.id,item(id,name,artists,album,duration_ms,preview_url,external_urls))`;

  while (url) {
    const pageRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageData: any = await pageRes.json();
    if (!pageRes.ok) {
      throw new Error(`Spotify API error ${pageRes.status}: ${pageData?.error?.message ?? JSON.stringify(pageData)}`);
    }
    // Spotify returns {} instead of [] for empty playlists
    const rawItems = Array.isArray(pageData.items) ? pageData.items : [];
    // Normalize "item" → "track" so the rest of the app is unchanged
    const normalized = rawItems.map((i: any) => ({
      ...i,
      track: i.item ?? i.track,
    }));
    items.push(...normalized);
    url = pageData.next ?? null;
  }

  return items.filter((i) => i.track);
}

export interface AudioFeatures {
  id: string;
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
}

export async function getAudioFeatures(trackIds: string[]): Promise<Map<string, AudioFeatures>> {
  const token = await getClientToken();
  const result = new Map<string, AudioFeatures>();
  // Spotify allows up to 100 IDs per request
  for (let i = 0; i < trackIds.length; i += 100) {
    const chunk = trackIds.slice(i, i + 100);
    const res = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${chunk.join(",")}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    console.log("[audio-features] status:", res.status, "keys:", Object.keys(data));
    for (const f of data.audio_features ?? []) {
      if (f?.id) result.set(f.id, f);
    }
  }
  return result;
}

export async function getRecommendations(seedTrackIds: string[], limit = 5): Promise<SpotifyTrack[]> {
  const token = await getClientToken();
  const seeds = seedTrackIds.slice(0, 5).join(",");
  const res = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seeds}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    }
  );
  const data = await res.json();
  return data.tracks ?? [];
}

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const token = await getClientToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  return res.json();
}

export async function getUserProfile(userId: string) {
  const token = await getClientToken();
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  return res.json();
}
