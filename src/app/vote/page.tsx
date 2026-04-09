"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SongCard } from "@/components/SongCard";
import { CheckCircle2, Lock } from "lucide-react";

interface Song {
  id: string;
  addedByName: string;
  addedByImage?: string | null;
  track: any;
  voteCount: number;
}

interface Week {
  id: string;
  number: number;
  theme: string;
  votingOpen: boolean;
  winnerId: string | null;
  songs: Song[];
  votes: { songId: string; userId: string }[];
}

export default function VotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [week, setWeek] = useState<Week | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    async function load() {
      const [weekRes, voteRes] = await Promise.all([
        fetch("/api/weeks"),
        fetch("/api/weeks/vote?weekId=current"),
      ]);
      const { week } = await weekRes.json();
      setWeek(week);

      if (week) {
        const voteCheck = await fetch(`/api/weeks/vote?weekId=${week.id}`);
        const { vote } = await voteCheck.json();
        if (vote) setMyVote(vote.songId);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleVote(songId: string) {
    if (!week || voting) return;
    setVoting(true);
    const res = await fetch("/api/weeks/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId, weekId: week.id }),
    });
    if (res.ok) {
      setMyVote(songId);
    }
    setVoting(false);
  }

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#f5841f] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!week || !week.votingOpen) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Lock size={48} className="mx-auto mb-4 text-[#f5f0e0]/30" />
        <h1
          className="text-3xl font-bold mb-3"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          Voting is closed
        </h1>
        <p className="text-[#f5f0e0]/60">
          {week?.winnerId
            ? "The votes are in — check the results on the home page."
            : "Voting hasn't opened yet. Check back soon!"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-[#f5841f] font-bold text-sm uppercase tracking-widest mb-1">
          Week {week.number}
        </p>
        <h1
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          {week.theme}
        </h1>
        <p className="text-[#f5f0e0]/60">
          {myVote
            ? "You've voted — you can change your vote until voting closes."
            : "Pick your favourite song of the week."}
        </p>
        {myVote && (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 text-[#4ecdc4] text-sm font-semibold">
            <CheckCircle2 size={16} />
            Vote saved!
          </div>
        )}
      </div>

      {/* Song grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {week.songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            isVoted={myVote === song.id}
            votingOpen={true}
            onVote={handleVote}
            disabled={!!myVote && myVote !== song.id}
          />
        ))}
      </div>
    </div>
  );
}
