"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Settings, RefreshCw, Vote, Trophy, Plus, Users, Trash2, UserPlus, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";

interface Song {
  id: string;
  spotifyTrackId: string;
  addedByName: string;
  addedBySpotifyId: string | null;
  addedByImage?: string | null;
  trackName: string | null;
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

interface Playlist {
  id: string;
  label: string;
}

export function AdminPanel({
  allWeeks,
  allUsers,
  playlists,
}: {
  allWeeks: Week[];
  allUsers: User[];
  playlists: Playlist[];
}) {
  const [weeks, setWeeks] = useState<Week[]>(allWeeks);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(allWeeks[0]?.id ?? null);
  const [users, setUsers] = useState<User[]>(allUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [newTheme, setNewTheme] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newPlaylistId, setNewPlaylistId] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberSpotify, setNewMemberSpotify] = useState("");
  const [editingSpotify, setEditingSpotify] = useState<string | null>(null);
  const [editingSpotifyValue, setEditingSpotifyValue] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? null;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewStart(today);
    setNewEnd(nextWeek);
  }, []);

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
      body: JSON.stringify({ theme: newTheme, startDate: newStart, endDate: newEnd, playlistId: newPlaylistId }),
    });
    const data = await res.json();
    if (res.ok) {
      const newWeek = { ...data.week, songs: [], votes: [] };
      setWeeks((w) => [newWeek, ...w]);
      setSelectedWeekId(newWeek.id);
      setNewTheme("");
      setNewPlaylistId("");
      toast("Week created!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function deleteWeek(weekId: string) {
    const target = weeks.find((w) => w.id === weekId);
    if (!target) return;
    if (!confirm(`Delete Week ${target.number} — ${target.theme}? This cannot be undone.`)) return;
    setLoading("delete-" + weekId);
    const res = await fetch("/api/admin/week", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId }),
    });
    if (res.ok) {
      const remaining = weeks.filter((w) => w.id !== weekId);
      setWeeks(remaining);
      if (selectedWeekId === weekId) setSelectedWeekId(remaining[0]?.id ?? null);
      toast("Week deleted.");
    } else {
      const data = await res.json();
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function action(actionName: string, label: string) {
    if (!selectedWeek) return;
    setLoading(actionName);
    const res = await fetch("/api/admin/week", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: selectedWeek.id, action: actionName }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.week) {
        setWeeks((ws) => ws.map((w) => w.id === selectedWeek.id ? { ...w, ...data.week } : w));
      }
      toast(label + " done!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function addMember() {
    if (!newMemberName.trim()) return;
    setLoading("add-member");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMemberName.trim(), spotifyUsername: newMemberSpotify.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((u) => [...u, data.user]);
      setNewMemberName("");
      setNewMemberSpotify("");
      toast("Member added!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  async function saveSpotifyId(userId: string) {
    const res = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, spotifyId: editingSpotifyValue }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((u) => u.map((m) => m.id === userId ? { ...m, spotifyId: data.user.spotifyId } : m));
      toast("Spotify ID saved!");
    } else {
      toast(data.error ?? "Error", false);
    }
    setEditingSpotify(null);
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member?")) return;
    setLoading("remove-" + userId);
    const res = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers((u) => u.filter((m) => m.id !== userId));
      toast("Member removed.");
    } else {
      const data = await res.json();
      toast(data.error ?? "Error", false);
    }
    setLoading(null);
  }

  const voteCounts = selectedWeek
    ? Object.fromEntries(
        selectedWeek.songs.map((s) => [
          s.id,
          selectedWeek.votes.filter((v) => v.songId === s.id).length,
        ])
      )
    : {};

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={28} className="text-[#a259c4]" />
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Fredoka, sans-serif" }}>
          Admin Panel
        </h1>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl font-semibold text-sm shadow-lg ${message.ok ? "bg-[#4ecdc4] text-[#0f0f1e]" : "bg-[#e8688a] text-white"}`}>
          {message.text}
        </div>
      )}

      {/* Create new week */}
      <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Plus size={18} className="text-[#f5841f]" /> New Week
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <select
            value={newPlaylistId}
            onChange={(e) => {
              const opt = playlists.find((p) => p.id === e.target.value);
              setNewPlaylistId(e.target.value);
              if (opt && !newTheme) setNewTheme(opt.label);
            }}
            className="sm:col-span-3 px-4 py-2.5 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm focus:outline-none focus:border-[#f5841f]"
          >
            <option value="">Select a playlist…</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
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
              disabled={!newTheme || !newStart || !newEnd || !newPlaylistId || loading === "create"}
              className="w-full px-4 py-2.5 rounded-xl bg-[#f5841f] text-white font-bold text-sm hover:bg-[#f9a94e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading === "create" ? "Creating…" : "Create Week"}
            </button>
          </div>
        </div>
      </section>

      {/* All weeks list */}
      <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Vote size={18} className="text-[#4ecdc4]" /> Weeks
        </h2>

        {weeks.length === 0 ? (
          <p className="text-sm text-[#f5f0e0]/40">No weeks yet.</p>
        ) : (
          <div className="space-y-2">
            {weeks.map((w) => {
              const isSelected = selectedWeekId === w.id;
              const wVoteCounts = Object.fromEntries(
                w.songs.map((s) => [s.id, w.votes.filter((v) => v.songId === s.id).length])
              );
              return (
                <div key={w.id} className={`rounded-xl border transition-all ${isSelected ? "border-[#4ecdc4]/40 bg-[#4ecdc4]/5" : "border-[#2a2a45] bg-[#0f0f1e]"}`}>
                  {/* Week row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setSelectedWeekId(isSelected ? null : w.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f5841f]/10 border border-[#f5841f]/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-[#f5841f]/60 uppercase leading-none">Wk</span>
                      <span className="text-sm font-bold text-[#f5841f] leading-none">{w.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#f5f0e0] truncate">{w.theme}</p>
                      <p className="text-xs text-[#f5f0e0]/40">
                        {w.songs.length} songs · {w.votes.length} votes
                        {w.votingOpen && <span className="text-[#4ecdc4] ml-1">· Voting open</span>}
                        {w.winnerId && <span className="text-[#f4c842] ml-1">· Winner set</span>}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteWeek(w.id); }}
                      disabled={!!loading}
                      className="shrink-0 p-1.5 rounded-lg text-[#f5f0e0]/20 hover:text-[#e8688a] hover:bg-[#e8688a]/10 transition-colors disabled:opacity-40"
                      title="Delete week"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="shrink-0 text-[#f5f0e0]/30">
                      {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {/* Expanded controls */}
                  {isSelected && (
                    <div className="px-4 pb-4 border-t border-[#2a2a45]/50 pt-3">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <button
                          onClick={() => action("sync-songs", "Sync songs")}
                          disabled={!!loading}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2a2a45] text-[#f5f0e0] font-semibold text-sm hover:bg-[#3a3a5a] transition-colors disabled:opacity-40"
                        >
                          <RefreshCw size={13} className={loading === "sync-songs" ? "animate-spin" : ""} />
                          Sync songs
                        </button>

                        <button
                          onClick={() => action("toggle-voting", "Toggle voting")}
                          disabled={!!loading || !!w.winnerId}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 ${
                            w.votingOpen
                              ? "bg-[#e8688a]/10 border border-[#e8688a]/30 text-[#e8688a] hover:bg-[#e8688a]/20"
                              : "bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/20"
                          }`}
                        >
                          <Vote size={13} />
                          {w.votingOpen ? "Close voting" : "Open voting"}
                        </button>

                        {w.votingOpen && (
                          <button
                            onClick={() => action("close-voting", "Close voting & set winner")}
                            disabled={!!loading}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f4c842]/10 border border-[#f4c842]/30 text-[#f4c842] font-semibold text-sm hover:bg-[#f4c842]/20 transition-colors disabled:opacity-40"
                          >
                            <Trophy size={13} />
                            Set winner
                          </button>
                        )}
                      </div>

                      {/* Vote breakdown */}
                      {w.songs.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-[#f5f0e0]/40 uppercase tracking-wider mb-2">Vote breakdown</p>
                          {w.songs
                            .sort((a, b) => (wVoteCounts[b.id] ?? 0) - (wVoteCounts[a.id] ?? 0))
                            .map((song) => (
                              <div
                                key={song.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                                  w.winnerId === song.id ? "bg-[#f4c842]/10 border border-[#f4c842]/30" : "bg-[#16162a]"
                                }`}
                              >
                                <div className="truncate">
                                  <span className="text-[#f5f0e0]/80">
                                    {w.winnerId === song.id && "👑 "}
                                    {song.trackName ?? song.spotifyTrackId}
                                  </span>
                                  <span className="text-[#f5f0e0]/40 text-xs ml-2">by {song.addedByName}</span>
                                </div>
                                <span className="font-bold text-[#f4c842] shrink-0 ml-3">
                                  {wVoteCounts[song.id] ?? 0}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Members */}
      <section className="rounded-2xl border border-[#2a2a45] bg-[#16162a] p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Users size={18} className="text-[#e8688a]" /> Members ({users.length})
        </h2>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Display name (for login)"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm placeholder:text-[#f5f0e0]/30 focus:outline-none focus:border-[#e8688a]"
            />
            <input
              type="text"
              placeholder="Spotify username (optional)"
              value={newMemberSpotify}
              onChange={(e) => setNewMemberSpotify(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f1e] border border-[#2a2a45] text-[#f5f0e0] text-sm placeholder:text-[#f5f0e0]/30 focus:outline-none focus:border-[#e8688a]"
            />
            <button
              onClick={addMember}
              disabled={!newMemberName.trim() || !!loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8688a]/10 border border-[#e8688a]/30 text-[#e8688a] font-semibold text-sm hover:bg-[#e8688a]/20 transition-colors disabled:opacity-40"
            >
              <UserPlus size={14} />
              Add
            </button>
          </div>
          <p className="text-xs text-[#f5f0e0]/30">Spotify username links the member to songs they added on the playlist</p>
        </div>

        <div className="space-y-1">
          {users.map((user) => (
            <div key={user.id} className="px-3 py-2 rounded-xl hover:bg-[#0f0f1e] transition-colors group">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image src={user.image} alt={user.name ?? ""} width={32} height={32} className="rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#2a2a45] flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-sm text-[#f5f0e0]/80">{user.name}</span>
                {user.isAdmin ? (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-lg bg-[#a259c4]/10 text-[#a259c4] border border-[#a259c4]/20">admin</span>
                ) : (
                  <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => { setEditingSpotify(user.id); setEditingSpotifyValue(user.spotifyId ?? ""); }}
                      className="text-[#f5f0e0]/30 hover:text-[#4ecdc4]"
                      title="Set Spotify ID"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => removeMember(user.id)} disabled={!!loading} className="text-[#f5f0e0]/30 hover:text-[#e8688a]">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              {editingSpotify === user.id ? (
                <div className="flex items-center gap-2 mt-1.5 ml-11">
                  <input
                    autoFocus
                    type="text"
                    value={editingSpotifyValue}
                    onChange={(e) => setEditingSpotifyValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveSpotifyId(user.id); if (e.key === "Escape") setEditingSpotify(null); }}
                    placeholder="Paste Spotify ID"
                    className="flex-1 px-2 py-1 rounded-lg bg-[#0f0f1e] border border-[#4ecdc4]/40 text-[#f5f0e0] text-xs focus:outline-none"
                  />
                  <button onClick={() => saveSpotifyId(user.id)} className="text-[#4ecdc4]"><Check size={14} /></button>
                  <button onClick={() => setEditingSpotify(null)} className="text-[#f5f0e0]/30"><X size={14} /></button>
                </div>
              ) : user.spotifyId ? (
                <p className="text-xs text-[#f5f0e0]/25 ml-11 mt-0.5 font-mono truncate">{user.spotifyId}</p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Unmatched Spotify IDs from selected week's songs */}
        {selectedWeek && selectedWeek.songs.length > 0 && (() => {
          const mappedIds = new Set(users.map((u) => u.spotifyId).filter(Boolean));
          const unmatched = [...new Set(selectedWeek.songs.map((s) => s.addedBySpotifyId).filter((id): id is string => !!id && !mappedIds.has(id)))];
          if (!unmatched.length) return null;
          return (
            <div className="mt-4 p-3 rounded-xl bg-[#0f0f1e] border border-[#2a2a45]">
              <p className="text-xs font-semibold text-[#f5f0e0]/40 uppercase tracking-wider mb-2">Unmatched song IDs (Week {selectedWeek.number})</p>
              <div className="space-y-1">
                {unmatched.map((id) => (
                  <p key={id} className="text-xs font-mono text-[#f5f0e0]/50 select-all">{id}</p>
                ))}
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
