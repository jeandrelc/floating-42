"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    await signIn("spotify", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Sunset gradient background */}
      <div className="absolute inset-0 sunset-gradient opacity-20" />
      <div className="confetti-bg absolute inset-0 opacity-30" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Cover art */}
        <div className="relative">
          <div className="absolute inset-0 blur-3xl opacity-40 sunset-gradient rounded-full scale-110" />
          <Image
            src="/playlist-cover.jpeg"
            alt="Floating 42.0"
            width={220}
            height={220}
            className="relative rounded-2xl shadow-2xl ring-4 ring-white/10"
            priority
          />
        </div>

        {/* Title */}
        <div>
          <h1
            className="text-5xl font-bold mb-2"
            style={{ fontFamily: "Fredoka, sans-serif" }}
          >
            <span className="text-[#f5841f]">Floating</span>{" "}
            <span className="text-[#f5f0e0]">42.0</span>
          </h1>
          <p className="text-[#f5f0e0]/60 text-lg">
            The weekly playlist battle
          </p>
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg bg-[#1DB954] text-white hover:bg-[#1ed760] transition-all hover:scale-105 shadow-lg shadow-[#1DB954]/30 disabled:opacity-60 disabled:scale-100"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          {loading ? "Redirecting…" : "Sign in with Spotify"}
        </button>

        <p className="text-[#f5f0e0]/40 text-sm max-w-xs">
          Only members of the Floating 42.0 group can sign in. Use the Spotify
          account you added to the playlist.
        </p>
      </div>
    </div>
  );
}
