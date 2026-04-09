import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { songId, weekId } = await req.json();
  if (!songId || !weekId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week?.votingOpen) {
    return NextResponse.json({ error: "Voting is not open" }, { status: 403 });
  }

  // Prevent voting for your own song
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });

  try {
    const vote = await prisma.vote.upsert({
      where: { weekId_userId: { weekId, userId: session.user.id } },
      create: { weekId, userId: session.user.id, songId },
      update: { songId },
    });
    return NextResponse.json({ vote });
  } catch {
    return NextResponse.json({ error: "Could not save vote" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ vote: null });

  const weekId = req.nextUrl.searchParams.get("weekId");
  if (!weekId) return NextResponse.json({ vote: null });

  const vote = await prisma.vote.findUnique({
    where: { weekId_userId: { weekId, userId: session.user.id } },
  });
  return NextResponse.json({ vote });
}
