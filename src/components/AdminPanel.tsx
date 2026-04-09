"use client";

import { useState } from "react";
import Image from "next/image";
import { Settings, RefreshCw, Vote, Trophy, Plus, Users, Trash2 } from "lucide-react";

interface Song {
  id: string;
  spotifyTrackId: string;
  addedByName: string;
  addedByImage?: string | null;
}

interface Week {
  id: string;
  number: number;
  theme: string;
  votingOpen: boolean;
  winnerId: string | null;
  songs: Song[];
  votes: { songId: string }[];
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
  spotifyId: string | null;
  isAdmin: boolean;
}

export function AdminPanel({
  currentWeek,
  allUsers,
}: {
  currentWeek: Week | null;
  allUsers: User[];
}) {
  const [week, setWeek] = useState<Week | null>(currentWeek);
  const [loading, setLoading] = useState<string | null>(null);
  const [newTheme, setNewTheme] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function toast(text: string, ok = true) {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3000);
  }

  async function createWeek() {
    if (!newTheme || !newStart || !newEnd) return;
    setLoading("create");
    const res = await fetch("/api/admin/week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme, startDate: newStart, endDate: newEnd }),
    });
    const data = await res.json();
    if (res.ok) {
      setWeek({ ...data.week, songs: [], votes: [] });
      setNewTheme("");
      setNewStart("");
      setNewEnd("");
      toast("Week created!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function deleteWeek() {
    if (!week) return;
    if (!confirm(`Delete Week ${week.number} — ${week.theme}? This cannot be undone.`)) return;
    setLoading("delete");
    const res = await fetch("/api/admin/week", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: week.id }),
    });
    if (res.ok) {
      setWeek(null);
      toast("Week deleted.");
    } else {
      const data = await res.json();
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function action(actionName: string, label: string) {
    if (!week) return;
    setLoading(actionName);
    const res = await fetch("/api/admin/week", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: week.id, action: actionName }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.week) setWeek((w) => ({ ...w!, ...data.week }));
      toast(label + " done!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  const voteCounts = week
    ? Object.fromEntries(
        week.songs.map((s) => [
          s.id,
          week.votes.filter((v) => v.songId === s.id).length,
        ])
      )
    : {};

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={28} className="text-[#a259c4]" />
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "Fredoka, sans-serif" }}
        >
          Admin Panel
        </h1>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl font-semibold text-sm shadow-lg ${
            message.ok
              ? "bg-[#4ecdc4] text-[#0f0f1e]"
              : "bg-[#e8688a] text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create new week */}
      <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Plus size={18} className="text-[#f5841f]" /> New Week
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="Theme (e.g. Blue Album Covers)"
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            className="sm:col-span-3 px-4 py-2.5 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm placeholder:text-[#f5f0e0]/30 focus:outline-none focus:border-[#f5841f]"
          />
          <div>
            <label className="text-xs text-[#f5f0e0]/40 mb-1 block">Start</label>
            <input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm focus:outline-none focus:border-[#f5841f]"
            />
          </div>
          <div>
            <label className="text-xs text-[#f5f0e0]/40 mb-1 block">End</label>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm focus:outline-none focus:border-[#f5841f]"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createWeek}
              disabled={!newTheme || !newStart || !newEnd || loading === "create"}
              className="w-full px-4 py-2.5 rounded-xl bg-[#f5841f] text-white font-bold text-sm hover:bg-[#f9a94e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading === "create" ? "Creating…" : "Create Week"}
            </button>
          </div>
        </div>
      </section>

      {/* Current week controls */}
      {week && (
        <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6 mb-6">
          <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
            <Vote size={18} className="text-[#4ecdc4]" /> Week {week.number} —{" "}
            {week.theme}
          </h2>
          <p className="text-xs text-[#f5f0e0]/40 mb-5">
            {week.songs.length} songs · {week.votes.length} votes ·{" "}
            {week.votingOpen ? "🟢 Voting open" : "🔴 Voting closed"}
            {week.winnerId && " · Winner set"}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => action("sync-songs", "Sync songs")}
              disabled={!!loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2a2a45] text-[#f5f0e0] font-semibold text-sm hover:bg-[#3a3a5a] transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading === "sync-songs" ? "animate-spin" : ""} />
              Sync songs from Spotify
            </button>

            <button
              onClick={() => action("toggle-voting", "Toggle voting")}
              disabled={!!loading || !!week.winnerId}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 ${
                week.votingOpen
                  ? "bg-[#e8688a]/10 border border-[#e8688a]/30 text-[#e8688a] hover:bg-[#e8688a]/20"
                  : "bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/20"
              }`}
            >
              <Vote size={14} />
              {week.votingOpen ? "Close voting" : "Open voting"}
            </button>

            {week.votingOpen && (
              <button
                onClick={() => action("close-voting", "Close voting & set winner")}
                disabled={!!loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f4c842]/10 border border-[#f4c842]/30 text-[#f4c842] font-semibold text-sm hover:bg-[#f4c842]/20 transition-colors disabled:opacity-40"
              >
                <Trophy size={14} />
                Close voting & set winner
              </button>
            )}

            <button
              onClick={deleteWeek}
              disabled={!!loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e8688a]/10 border border-[#e8688a]/30 text-[#e8688a] font-semibold text-sm hover:bg-[#e8688a]/20 transition-colors disabled:opacity-40 ml-auto"
            >
              <Trash2 size={14} />
              Delete week
            </button>
          </div>

          {/* Vote breakdown */}
          {week.songs.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold text-[#f5f0e0]/40 uppercase tracking-wider">
                Vote breakdown
              </p>
              {week.songs
                .sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0))
                .map((song) => (
                  <div
                    key={song.id}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${
                      week.winnerId === song.id
                        ? "bg-[#f4c842]/10 border border-[#f4c842]/30"
                        : "bg-[#0f0f1e]"
                    }`}
                  >
                    <span className="text-[#f5f0e0]/80 truncate">
                      {week.winnerId === song.id && "👑 "}
                      {song.addedByName}
                    </span>
                    <span className="font-bold text-[#f4c842] shrink-0 ml-3">
                      {voteCounts[song.id] ?? 0} votes
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Users size={18} className="text-[#e8688a]" /> Members ({allUsers.length})
        </h2>
        <div className="space-y-2">
          {allUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#0f0f1e] transition-colors"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? ""}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#2a2a45] flex items-center justify-center text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-sm text-[#f5f0e0]/80">{user.name}</span>
              {user.isAdmin && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-lg bg-[#a259c4]/10 text-[#a259c4] border border-[#a259c4]/20">
                  admin
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
