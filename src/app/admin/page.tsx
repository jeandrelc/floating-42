import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const week = await prisma.week.findFirst({
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
    select: { id: true, name: true, image: true, spotifyId: true, isAdmin: true },
    orderBy: { name: "asc" },
  });

  // Apply Spotify ID → display name mapping to songs
  const spotifyToName = Object.fromEntries(
    allUsers
      .filter((u) => u.spotifyId)
      .map((u) => [u.spotifyId!, u.name ?? u.spotifyId!])
  );

  const mappedWeek = week
    ? {
        ...week,
        songs: week.songs.map((s) => ({
          ...s,
          addedByName:
            s.addedBySpotifyId && spotifyToName[s.addedBySpotifyId]
              ? spotifyToName[s.addedBySpotifyId]
              : s.addedByName,
        })),
      }
    : null;

  return <AdminPanel currentWeek={mappedWeek} allUsers={allUsers} />;
}
