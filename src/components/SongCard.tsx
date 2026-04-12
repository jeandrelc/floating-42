"use client";

import Image from "next/image";
import { Music, ExternalLink, CheckCircle2 } from "lucide-react";
import type { SpotifyTrack } from "@/lib/spotify";

export interface AudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  acousticness: number;
}

interface SongCardProps {
  song: {
    id: string;
    addedByName: string;
    addedByImage?: string | null;
    track: SpotifyTrack | null;
    voteCount?: number;
    audioFeatures?: AudioFeatures | null;
    tags?: string[] | null;
  };
  isWinner?: boolean;
  isVoted?: boolean;
  votingOpen?: boolean;
  showVoteCount?: boolean;
  onVote?: (songId: string) => void;
  disabled?: boolean;
}

const ACCENT_COLOURS = [
  "#f5841f",
  "#e8688a",
  "#4ecdc4",
  "#a259c4",
  "#f4c842",
];

function colourForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ACCENT_COLOURS[Math.abs(hash) % ACCENT_COLOURS.length];
}

function FeatureBar({ label, value, color, title }: { label: string; value: number; color: string; title: string }) {
  return (
    <div className="flex items-center gap-1" title={`${title}: ${Math.round(value * 100)}%`}>
      <span className="text-[10px] leading-none">{label}</span>
      <div className="w-10 h-1 rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function SongCard({
  song,
  isWinner = false,
  isVoted = false,
  votingOpen = false,
  showVoteCount = false,
  onVote,
  disabled = false,
}: SongCardProps) {
  const { track, addedByName, voteCount, audioFeatures, tags } = song;
  const accent = colourForName(addedByName);
  const albumArt = track?.album.images[0]?.url;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 ${
        isWinner
          ? "border-[#f4c842] bg-[#f4c842]/10 shadow-lg shadow-[#f4c842]/10"
          : isVoted
          ? "border-[#4ecdc4] bg-[#4ecdc4]/10"
          : "border-[#2a2a45] bg-[#16162a] hover:border-[#3a3a5a]"
      }`}
      style={isWinner ? { boxShadow: `0 0 30px ${accent}22` } : undefined}
    >
      {/* Winner crown */}
      {isWinner && (
        <div className="absolute top-3 right-3 text-[#f4c842] text-xl z-10">
          👑
        </div>
      )}

      <div className="flex gap-4 p-4">
        {/* Album art */}
        <div className="shrink-0 relative">
          {albumArt ? (
            <Image
              src={albumArt}
              alt={track?.album.name ?? ""}
              width={72}
              height={72}
              className="rounded-xl"
            />
          ) : (
            <div
              className="w-[72px] h-[72px] rounded-xl flex items-center justify-center"
              style={{ background: `${accent}33` }}
            >
              <Music size={28} style={{ color: accent }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-[#f5f0e0] truncate text-sm leading-tight">
                {track?.name ?? "Unknown track"}
              </p>
              <p className="text-[#f5f0e0]/60 text-xs truncate mt-0.5">
                {track?.artists.map((a) => a.name).join(", ") ?? "Unknown artist"}
              </p>
            </div>
            {track && (
              <a
                href={track.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[#f5f0e0]/30 hover:text-[#1DB954] transition-colors mt-0.5"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Added by */}
          <div className="flex items-center gap-1.5 mt-2">
            {song.addedByImage ? (
              <Image
                src={song.addedByImage}
                alt={addedByName}
                width={16}
                height={16}
                className="rounded-full"
              />
            ) : (
              <div
                className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: accent }}
              >
                {addedByName[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-xs" style={{ color: accent }}>
              {addedByName}
            </span>
          </div>

          {/* Genre tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium capitalize"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spotify embed */}
      {track && (
        <div className="px-4 pb-3">
          <iframe
            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </div>
      )}

      {/* Vote row */}
      {(votingOpen || showVoteCount) && (
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          {showVoteCount && (
            <span className="text-sm font-semibold" style={{ color: accent }}>
              {voteCount} {voteCount === 1 ? "vote" : "votes"}
            </span>
          )}
          {votingOpen && onVote && (
            <button
              onClick={() => onVote(song.id)}
              disabled={disabled && !isVoted}
              className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isVoted
                  ? "bg-[#4ecdc4] text-[#0f0f1e]"
                  : disabled
                  ? "bg-white/5 text-[#f5f0e0]/30 cursor-not-allowed"
                  : "bg-[#f5841f] text-white hover:bg-[#f9a94e]"
              }`}
            >
              {isVoted && <CheckCircle2 size={14} />}
              {isVoted ? "Voted!" : "Vote"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
