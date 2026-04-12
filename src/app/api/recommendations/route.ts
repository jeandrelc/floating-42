import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecommendations } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trackId = req.nextUrl.searchParams.get("trackId");
  if (!trackId) return NextResponse.json({ error: "Missing trackId" }, { status: 400 });

  try {
    const tracks = await getRecommendations([trackId], 5);
    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 502 });
  }
}
