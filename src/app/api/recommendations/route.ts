import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSimilarTracks } from "@/lib/lastfm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const artist = req.nextUrl.searchParams.get("artist");
  const track = req.nextUrl.searchParams.get("track");
  if (!artist || !track) return NextResponse.json({ error: "Missing artist or track" }, { status: 400 });

  try {
    const tracks = await getSimilarTracks(artist, track, 6);
    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 502 });
  }
}
