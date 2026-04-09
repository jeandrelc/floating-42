import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  // Build a map from Spotify user ID → display name for members who have one linked
  const members = await prisma.user.findMany({
    where: { spotifyId: { not: null } },
    select: { spotifyId: true, name: true },
  });
  const spotifyToName = Object.fromEntries(
    members.map((m) => [m.spotifyId!, m.name ?? m.spotifyId!])
  );

  const songsWithMeta = week.songs.map((song) => ({
    ...song,
    addedByName: (song.addedBySpotifyId && spotifyToName[song.addedBySpotifyId])
      ? spotifyToName[song.addedBySpotifyId]
      : song.addedByName,
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
