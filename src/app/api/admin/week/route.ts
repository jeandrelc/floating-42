import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlaylistTracks, getUserProfile } from "@/lib/spotify";
import type { Session } from "next-auth";

function requireAdmin(session: Session | null) {
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// POST /api/admin/week - create a new week
export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { theme, startDate, endDate } = await req.json();
  if (!theme || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
  const number = (lastWeek?.number ?? 0) + 1;

  const week = await prisma.week.create({
    data: {
      number,
      theme,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  return NextResponse.json({ week });
}

// PATCH /api/admin/week - update current week (toggle voting, set winner, sync songs)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await req.json();
  const { weekId, action } = body;

  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

  if (action === "toggle-voting") {
    const updated = await prisma.week.update({
      where: { id: weekId },
      data: { votingOpen: !week.votingOpen },
    });
    return NextResponse.json({ week: updated });
  }

  if (action === "sync-songs") {
    // Use the admin's stored Spotify access token (refresh if expired)
    const adminAccount = await prisma.account.findFirst({
      where: { user: { isAdmin: true }, provider: "spotify" },
    });

    let accessToken = adminAccount?.access_token ?? undefined;

    if (
      adminAccount?.refresh_token &&
      adminAccount.expires_at &&
      adminAccount.expires_at * 1000 < Date.now()
    ) {
      const refreshRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: adminAccount.refresh_token,
        }),
      });
      const refreshed = await refreshRes.json();
      accessToken = refreshed.access_token;
      await prisma.account.update({
        where: { id: adminAccount.id },
        data: {
          access_token: refreshed.access_token,
          expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
          ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
        },
      });
    }

    // Pull songs added to the playlist since the week started
    const tracks = await getPlaylistTracks(accessToken);
    console.log("[sync] accessToken present:", !!accessToken);
    console.log("[sync] total tracks fetched:", tracks.length);
    console.log("[sync] week.startDate:", week.startDate);
    tracks.slice(0, 5).forEach((t) =>
      console.log("[sync] track:", t.added_at, t.track?.name)
    );

    const weekSongs = await prisma.song.findMany({ where: { weekId } });
    const existingTrackIds = new Set(weekSongs.map((s) => s.spotifyTrackId));

    const newTracks = tracks.filter(
      (t) =>
        new Date(t.added_at) >= week.startDate &&
        !existingTrackIds.has(t.track.id)
    );
    console.log("[sync] new tracks after filter:", newTracks.length);

    for (const t of newTracks) {
      // Try to get Spotify username for display
      let addedByName = t.added_by.id;
      let addedByImage: string | undefined;
      try {
        const profile = await getUserProfile(t.added_by.id);
        addedByName = profile.display_name ?? t.added_by.id;
        addedByImage = profile.images?.[0]?.url;
      } catch {}

      await prisma.song.upsert({
        where: { id: `${weekId}-${t.track.id}` },
        create: {
          id: `${weekId}-${t.track.id}`,
          weekId,
          spotifyTrackId: t.track.id,
          addedByName,
          addedByImage,
          trackName: t.track.name,
          artistNames: t.track.artists.map((a) => a.name).join(", "),
          albumImageUrl: t.track.album.images[0]?.url ?? null,
          spotifyUrl: t.track.external_urls.spotify,
        },
        update: {},
      });
    }

    const synced = await prisma.song.count({ where: { weekId } });
    return NextResponse.json({ synced });
  }

  if (action === "close-voting") {
    // Tally votes and pick winner
    const votes = await prisma.vote.groupBy({
      by: ["songId"],
      where: { weekId },
      _count: { songId: true },
      orderBy: { _count: { songId: "desc" } },
    });

    const winningSongId = votes[0]?.songId;
    const updated = await prisma.week.update({
      where: { id: weekId },
      data: {
        votingOpen: false,
        winnerId: winningSongId ?? null,
      },
    });
    return NextResponse.json({ week: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE /api/admin/week - delete a week and all its songs/votes
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { weekId } = await req.json();
  if (!weekId) return NextResponse.json({ error: "Missing weekId" }, { status: 400 });

  await prisma.vote.deleteMany({ where: { weekId } });
  await prisma.song.deleteMany({ where: { weekId } });
  await prisma.week.delete({ where: { id: weekId } });

  return NextResponse.json({ ok: true });
}
