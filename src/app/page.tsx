import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SongCard } from "@/components/SongCard";
import { Clock, Music2, Users, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const revalidate = 60;

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const week = await prisma.week.findFirst({
    orderBy: { number: "desc" },
    include: {
      songs: true,
      votes: { select: { songId: true, userId: true } },
    },
  });

  if (!week) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Image
          src="/playlist-cover.jpeg"
          alt="Floating 42.0"
          width={160}
          height={160}
          className="rounded-2xl mx-auto mb-6 shadow-2xl"
        />
        <h1
          className="text-4xl font-bold mb-3"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          No week yet!
        </h1>
        <p className="text-[#f5f0e0]/60">
          Ask the admin to set up this week&apos;s theme.
        </p>
      </div>
    );
  }

  const totalMembers = await prisma.user.count();

  const members = await prisma.user.findMany({
    where: { spotifyId: { not: null } },
    select: { spotifyId: true, name: true },
  });
  const spotifyToName = Object.fromEntries(
    members.map((m) => [m.spotifyId!, m.name ?? m.spotifyId!])
  );

  const songsWithMeta = week.songs.map((song) => ({
    ...song,
    addedByName:
      song.addedBySpotifyId && spotifyToName[song.addedBySpotifyId]
        ? spotifyToName[song.addedBySpotifyId]
        : song.addedByName,
    track: song.trackName
      ? {
          id: song.spotifyTrackId,
          name: song.trackName,
          artists: (song.artistNames ?? "").split(", ").map((n) => ({ name: n })),
          album: { name: "", images: song.albumImageUrl ? [{ url: song.albumImageUrl, width: 300, height: 300 }] : [] },
          duration_ms: 0,
          preview_url: null,
          external_urls: { spotify: song.spotifyUrl ?? "" },
        }
      : null,
    audioFeatures: song.energy != null
      ? { energy: song.energy, danceability: song.danceability!, valence: song.valence!, tempo: song.tempo!, acousticness: song.acousticness! }
      : null,
    tags: song.tags ? (JSON.parse(song.tags) as string[]) : null,
    listeners: song.listeners ?? null,
    wikiSummary: song.wikiSummary ?? null,
    artistBio: song.artistBio ?? null,
    voteCount: week.votes.filter((v) => v.songId === song.id).length,
  }));

  const uniqueSubmitterCount = new Set(
    week.songs.map((s) => s.addedBySpotifyId ?? `name:${s.addedByName}`)
  ).size;

  const uniqueVoterCount = new Set(week.votes.map((v) => v.userId)).size;

  // Aggregate genre tags across the week
  const tagCounts = new Map<string, number>();
  for (const song of songsWithMeta) {
    for (const tag of song.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const maxVoteCount =
    !week.votingOpen && week.winnerId
      ? Math.max(...songsWithMeta.map((s) => s.voteCount))
      : 0;

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const deadline = new Date(week.endDate);
  const isOver = deadline < new Date();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden mb-10 border border-[#2a2a45]">
        <div className="absolute inset-0 sunset-gradient opacity-15" />
        <div className="confetti-bg absolute inset-0 opacity-20" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 p-8">
          <Image
            src="/playlist-cover.jpeg"
            alt="Floating 42.0"
            width={120}
            height={120}
            className="rounded-2xl shadow-2xl shrink-0 ring-4 ring-white/10"
          />
          <div>
            <p className="text-[#f5841f] font-bold text-sm uppercase tracking-widest mb-1">
              Week {week.number}
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold mb-3 text-[#f5f0e0]"
              style={{ fontFamily: "Fredoka, sans-serif" }}
            >
              {week.theme}
            </h1>
            <div className="flex items-center gap-2 text-[#f5f0e0]/60 text-sm">
              <Clock size={14} />
              {isOver ? (
                <span>Week ended</span>
              ) : (
                <span>
                  Ends {formatDistanceToNow(deadline, { addSuffix: true })}
                </span>
              )}
              <span className="text-[#f5f0e0]/30">·</span>
              <Music2 size={14} />
              <span>{songsWithMeta.length} songs added</span>
            </div>
            <div className="flex items-center gap-2 text-[#f5f0e0]/60 text-sm mt-1">
              <Users size={14} />
              <span>{uniqueSubmitterCount}/{totalMembers} members submitted</span>
              {(week.votingOpen || !!week.winnerId) && (
                <>
                  <span className="text-[#f5f0e0]/30">·</span>
                  <ThumbsUp size={14} />
                  <span>{uniqueVoterCount}/{totalMembers} voted</span>
                </>
              )}
            </div>
            {week.votingOpen && (
              <div className="mt-4">
                <Link
                  href="/vote"
                  className="inline-block px-6 py-2.5 rounded-xl bg-[#f5841f] text-white font-bold hover:bg-[#f9a94e] transition-colors text-sm"
                >
                  Voting is open — cast your vote →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Week vibe — genre tag cloud */}
      {topTags.length > 0 && (
        <div className="mb-8 rounded-2xl border border-[#2a2a45] bg-[#16162a] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f5f0e0]/40 mb-3">
            This Week&apos;s Vibe
          </p>
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag, i) => {
              const colors = ["#f5841f", "#4ecdc4", "#a259c4", "#e8688a", "#f4c842", "#f5841f", "#4ecdc4", "#a259c4"];
              const color = colors[i % colors.length];
              return (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm font-semibold capitalize"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Songs */}
      <h2
        className="text-2xl font-bold mb-5"
        style={{ fontFamily: "Fredoka, sans-serif" }}
      >
        This Week&apos;s Songs
      </h2>

      {songsWithMeta.length === 0 ? (
        <div className="text-center py-16 text-[#f5f0e0]/40">
          <Music2 size={48} className="mx-auto mb-3 opacity-40" />
          <p>No songs added yet. Add yours to the Spotify playlist!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {songsWithMeta.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isWinner={!week.votingOpen && !!week.winnerId && song.voteCount === maxVoteCount && maxVoteCount > 0}
              showVoteCount={!week.votingOpen && !!week.winnerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

