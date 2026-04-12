import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSimilarTracks, getSimilarArtists, getArtistTopTracks } from "@/lib/lastfm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const artist = req.nextUrl.searchParams.get("artist");
  const track = req.nextUrl.searchParams.get("track");
  if (!artist || !track) return NextResponse.json({ error: "Missing artist or track" }, { status: 400 });

  try {
    // Try track similarity first
    let tracks = await getSimilarTracks(artist, track, 6);

    // Fall back to similar artists' top tracks if no results
    if (tracks.length === 0) {
      const similarArtists = await getSimilarArtists(artist, 3);
      const artistTracks = await Promise.all(
        similarArtists.slice(0, 3).map((a) => getArtistTopTracks(a.name, 2))
      );
      tracks = artistTracks.flat().slice(0, 6);
    }

    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 502 });
  }
}
