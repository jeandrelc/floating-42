import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrack } from "@/lib/spotify";
import { format } from "date-fns";
import { History } from "lucide-react";

export const revalidate = 300;

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const weeks = await prisma.week.findMany({
    orderBy: { number: "desc" },
    include: {
      songs: true,
      votes: { select: { songId: true } },
    },
  });

  const weeksWithMeta = await Promise.all(
    weeks.map(async (week) => {
      const voteCounts = new Map<string, number>();
      for (const vote of week.votes) {
        voteCounts.set(vote.songId, (voteCounts.get(vote.songId) ?? 0) + 1);
      }
      const maxVotes = week.winnerId ? Math.max(0, ...voteCounts.values()) : 0;
      const winningSongs = maxVotes > 0
        ? week.songs.filter((s) => (voteCounts.get(s.id) ?? 0) === maxVotes)
        : [];
      const winnerTracks = await Promise.all(
        winningSongs.map(async (song) => {
          try { return await getTrack(song.spotifyTrackId); } catch { return null; }
        })
      );
      return { week, winningSongs, winnerTracks, winnerVotes: maxVotes };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <History size={40} className="mx-auto mb-3 text-[#4ecdc4]" />
        <h1
          className="text-4xl font-bold"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          History
        </h1>
        <p className="text-[#f5f0e0]/60 mt-1">Every week, archived</p>
      </div>

      {weeks.length === 0 ? (
        <p className="text-center text-[#f5f0e0]/40 py-10">
          No weeks yet!
        </p>
      ) : (
        <div className="space-y-4">
          {weeksWithMeta.map(({ week, winningSongs, winnerTracks, winnerVotes }) => {
            const isActive = !week.winnerId && week.votingOpen !== false;
            const firstTrack = winnerTracks[0] ?? null;
            return (
              <div
                key={week.id}
                className="rounded-2xl border border-[#2a2a45] bg-[#16162a] overflow-hidden"
              >
                <div className="flex items-center gap-4 p-5">
                  {/* Week badge */}
                  <div className="w-14 h-14 rounded-2xl bg-[#f5841f]/10 border border-[#f5841f]/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-[#f5841f]/60 uppercase">
                      Week
                    </span>
                    <span className="text-lg font-bold text-[#f5841f] leading-none">
                      {week.number}
                    </span>
                  </div>

                  {/* Winner album art */}
                  {firstTrack?.album.images[0] ? (
                    <Image
                      src={firstTrack.album.images[0].url}
                      alt={firstTrack.album.name}
                      width={52}
                      height={52}
                      className="rounded-xl shrink-0"
                    />
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-xl bg-[#2a2a45] shrink-0" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#f5f0e0] truncate">
                          {week.theme}
                        </p>
                        <p className="text-xs text-[#f5f0e0]/40 mt-0.5">
                          {format(new Date(week.startDate), "d MMM")} –{" "}
                          {format(new Date(week.endDate), "d MMM yyyy")}
                        </p>
                      </div>
                      <span className="text-xs text-[#f5f0e0]/40 shrink-0">
                        {week.songs.length} songs
                      </span>
                    </div>

                    {winningSongs.length > 0 ? (
                      <div className="mt-2 space-y-0.5">
                        {winningSongs.map((song, i) => (
                          <div key={song.id} className="flex items-center gap-1.5">
                            <span className="text-sm">👑</span>
                            <span className="text-sm font-semibold text-[#f4c842] truncate">
                              {winnerTracks[i]?.name ?? "Unknown"} —{" "}
                              {song.addedByName}
                            </span>
                            {i === 0 && (
                              <span className="text-xs text-[#f5f0e0]/40 shrink-0">
                                ({winnerVotes} votes)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isActive ? (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-lg bg-[#4ecdc4]/10 text-[#4ecdc4] text-xs font-semibold">
                        In progress
                      </span>
                    ) : (
                      <span className="text-xs text-[#f5f0e0]/30 mt-2 block">
                        No winner declared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
