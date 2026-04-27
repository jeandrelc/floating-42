import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrack } from "@/lib/spotify";
import { Trophy } from "lucide-react";

export const revalidate = 300;

const MEDALS = ["🥇", "🥈", "🥉"];
const ACCENT_COLOURS = ["#f4c842", "#e8e8e8", "#f5841f", "#4ecdc4", "#a259c4"];

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Get all weeks with a winner
  const weeks = await prisma.week.findMany({
    where: { winnerId: { not: null } },
    include: {
      songs: true,
      votes: { select: { songId: true } },
    },
    orderBy: { number: "desc" },
  });

  // Build Spotify ID → display name map
  const members = await prisma.user.findMany({
    where: { spotifyId: { not: null } },
    select: { spotifyId: true, name: true },
  });
  const spotifyToName = Object.fromEntries(
    members.map((m) => [m.spotifyId!, m.name ?? m.spotifyId!])
  );

  function resolveName(song: { addedByName: string; addedBySpotifyId: string | null }) {
    return (song.addedBySpotifyId && spotifyToName[song.addedBySpotifyId])
      ? spotifyToName[song.addedBySpotifyId]
      : song.addedByName;
  }

  // Build per-person win count
  const winsByPerson = new Map<string, { name: string; image?: string | null; wins: number }>();

  for (const week of weeks) {
    const voteCounts = new Map<string, number>();
    for (const vote of week.votes) {
      voteCounts.set(vote.songId, (voteCounts.get(vote.songId) ?? 0) + 1);
    }
    const maxVotes = Math.max(0, ...voteCounts.values());
    if (maxVotes === 0) continue;
    const winningSongs = week.songs.filter((s) => (voteCounts.get(s.id) ?? 0) === maxVotes);
    for (const winningSong of winningSongs) {
      const key = resolveName(winningSong);
      const existing = winsByPerson.get(key);
      if (existing) {
        existing.wins++;
      } else {
        winsByPerson.set(key, {
          name: key,
          image: winningSong.addedByImage,
          wins: 1,
        });
      }
    }
  }

  const leaderboard = [...winsByPerson.values()].sort((a, b) => b.wins - a.wins);

  // Recent winners (last 5 weeks)
  const recentWinners = await Promise.all(
    weeks.slice(0, 5).map(async (week) => {
      const voteCounts = new Map<string, number>();
      for (const vote of week.votes) {
        voteCounts.set(vote.songId, (voteCounts.get(vote.songId) ?? 0) + 1);
      }
      const maxVotes = Math.max(0, ...voteCounts.values());
      const winningSongs = maxVotes > 0
        ? week.songs.filter((s) => (voteCounts.get(s.id) ?? 0) === maxVotes)
        : [];
      const tracks = await Promise.all(
        winningSongs.map(async (song) => {
          try { return await getTrack(song.spotifyTrackId); } catch { return null; }
        })
      );
      return { week, winningSongs, tracks, voteCount: maxVotes };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <Trophy size={40} className="mx-auto mb-3 text-[#f4c842]" />
        <h1
          className="text-4xl font-bold"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          Leaderboard
        </h1>
        <p className="text-[#f5f0e0]/60 mt-1">All-time weekly winners</p>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-center text-[#f5f0e0]/40 py-10">
          No winners yet — first week in progress!
        </p>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {leaderboard.map((person, i) => {
              const accent = ACCENT_COLOURS[i] ?? "#f5f0e0";
              return (
                <div
                  key={person.name}
                  className="relative rounded-2xl border p-5 text-center"
                  style={{
                    borderColor: i < 3 ? `${accent}50` : "#2a2a45",
                    background: i < 3 ? `${accent}0d` : "#16162a",
                  }}
                >
                  {i < 3 && (
                    <div className="text-3xl mb-2">{MEDALS[i]}</div>
                  )}
                  {person.image ? (
                    <Image
                      src={person.image}
                      alt={person.name}
                      width={56}
                      height={56}
                      className="rounded-full mx-auto mb-2 ring-2"
                      style={{ ringColor: accent } as React.CSSProperties}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-white"
                      style={{ background: accent }}
                    >
                      {person.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <p className="font-bold text-[#f5f0e0]">{person.name}</p>
                  <p className="text-sm mt-0.5" style={{ color: accent }}>
                    {person.wins} {person.wins === 1 ? "win" : "wins"}
                  </p>
                  {i === 0 && (
                    <div className="absolute -top-2 -right-2 text-lg">👑</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent winners */}
          <h2
            className="text-2xl font-bold mb-5"
            style={{ fontFamily: "Fredoka, sans-serif" }}
          >
            Recent Winners
          </h2>
          <div className="space-y-3">
            {recentWinners.map(({ week, winningSongs, tracks, voteCount }) => (
              <div
                key={week.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#2a2a45] bg-[#16162a]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f4c842]/10 border border-[#f4c842]/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#f4c842]">
                    W{week.number}
                  </span>
                </div>
                {tracks[0]?.album.images[0] && (
                  <Image
                    src={tracks[0].album.images[0].url}
                    alt={tracks[0].album.name}
                    width={44}
                    height={44}
                    className="rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {winningSongs.map((song, i) => (
                    <div key={song.id} className={i > 0 ? "mt-1" : ""}>
                      <p className="font-bold text-sm text-[#f5f0e0] truncate">
                        {tracks[i]?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-[#f5f0e0]/60 truncate">
                        {tracks[i]?.artists.map((a) => a.name).join(", ")} ·{" "}
                        <span className="text-[#f5841f]">{resolveName(song)}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#f5f0e0]/40">{week.theme}</p>
                  <p className="text-xs text-[#f4c842] font-semibold mt-0.5">
                    {voteCount} votes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
