import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const weeks = await prisma.week.findMany({
    orderBy: { number: "desc" },
    include: {
      songs: {
        select: {
          id: true,
          spotifyTrackId: true,
          addedByName: true,
          addedBySpotifyId: true,
          addedByImage: true,
          trackName: true,
        },
      },
      votes: { select: { songId: true } },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, spotifyId: true, loginCode: true, isAdmin: true },
    orderBy: { name: "asc" },
  });

  // Apply Spotify ID → display name mapping to songs
  const spotifyToName = Object.fromEntries(
    allUsers
      .filter((u) => u.spotifyId)
      .map((u) => [u.spotifyId!, u.name ?? u.spotifyId!])
  );

  const mappedWeeks = weeks.map((week) => ({
    ...week,
    songs: week.songs.map((s) => ({
      ...s,
      addedByName:
        s.addedBySpotifyId && spotifyToName[s.addedBySpotifyId]
          ? spotifyToName[s.addedBySpotifyId]
          : s.addedByName,
    })),
  }));

  const playlists = [
    { label: "Instrumental", id: process.env.SPOTIFY_PLAYLIST_ID ?? "" },
    { label: "Blue Album Cover", id: process.env.SPOTIFY_PLAYLIST_ID_2 ?? "" },
    { label: "Holiday", id: process.env.SPOTIFY_PLAYLIST_ID_3 ?? "" },
    { label: "Beers to Drink Songs To", id: process.env.SPOTIFY_PLAYLIST_ID_4 ?? "" },
  ].filter((p) => p.id);

  return <AdminPanel allWeeks={mappedWeeks} allUsers={allUsers} playlists={playlists} />;
}
