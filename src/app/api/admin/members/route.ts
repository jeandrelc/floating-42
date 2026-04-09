import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/members - add a new member by username
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, spotifyUsername } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  // Resolve Spotify vanity username → internal user ID
  let spotifyId: string | undefined;
  if (spotifyUsername?.trim()) {
    const adminAccount = await prisma.account.findFirst({
      where: { user: { isAdmin: true }, provider: "spotify" },
    });
    if (adminAccount?.access_token) {
      const profileRes = await fetch(
        `https://api.spotify.com/v1/users/${encodeURIComponent(spotifyUsername.trim())}`,
        { headers: { Authorization: `Bearer ${adminAccount.access_token}` } }
      );
      if (profileRes.ok) {
        const profile = await profileRes.json();
        spotifyId = profile.id;
      }
    }
    // Fallback: store whatever was entered if we couldn't resolve it
    if (!spotifyId) spotifyId = spotifyUsername.trim();
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      ...(spotifyId ? { spotifyId } : {}),
    },
  });
  return NextResponse.json({ user });
}

// PATCH /api/admin/members - update a member's Spotify ID
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, spotifyId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { spotifyId: spotifyId?.trim() || null },
  });

  return NextResponse.json({ user });
}

// DELETE /api/admin/members - remove a member
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.vote.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
