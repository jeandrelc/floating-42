import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// GET /api/weeks - returns current week + its songs with stored track metadata
export async function GET() {
  const week = await prisma.week.findFirst({
    orderBy: { number: "desc" },
    include: {
      songs: true,
      votes: { select: { songId: true, userId: true } },
    },
  });

  if (!week) {
    return NextResponse.json({ week: null });
  }

  const songsWithMeta = week.songs.map((song) => ({
    ...song,
    track: song.trackName
      ? {
          id: song.spotifyTrackId,
          name: song.trackName,
          artists: (song.artistNames ?? "").split(", ").map((n) => ({ name: n })),
          album: { name: "", images: song.albumImageUrl ? [{ url: song.albumImageUrl }] : [] },
          duration_ms: 0,
          preview_url: null,
          external_urls: { spotify: song.spotifyUrl ?? "" },
        }
      : null,
    voteCount: week.votes.filter((v) => v.songId === song.id).length,
  }));

  return NextResponse.json({
    week: {
      ...week,
      songs: songsWithMeta,
    },
  });
}
