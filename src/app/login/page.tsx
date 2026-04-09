"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      name: name.trim(),
      code: code.trim(),
      callbackUrl: "/",
      redirect: false,
    });
    if (!res) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    } else if (res.error || !res.ok) {
      setError("Wrong invite code. Ask the group admin for the code.");
      setLoading(false);
    } else {
      window.location.replace(res.url ?? "/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 sunset-gradient opacity-20" />
      <div className="confetti-bg absolute inset-0 opacity-30" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center w-full max-w-sm">
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
          <p className="text-[#f5f0e0]/60 text-lg">The weekly playlist battle</p>
        </div>

        {/* Invite code form */}
        <form onSubmit={handleJoin} className="w-full flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-[#16162a] border border-[#2a2a45] text-[#f5f0e0] placeholder:text-[#f5f0e0]/30 focus:outline-none focus:border-[#f5841f] text-sm"
          />
          <input
            type="password"
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-[#16162a] border border-[#2a2a45] text-[#f5f0e0] placeholder:text-[#f5f0e0]/30 focus:outline-none focus:border-[#f5841f] text-sm"
          />
          {error && <p className="text-[#e8688a] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim() || !code.trim()}
            className="w-full px-8 py-4 rounded-2xl font-bold text-lg bg-[#f5841f] text-white hover:bg-[#f9a94e] transition-all hover:scale-105 shadow-lg shadow-[#f5841f]/30 disabled:opacity-60 disabled:scale-100"
          >
            {loading ? "Joining…" : "Join the battle"}
          </button>
        </form>

        {/* Hidden admin Spotify login */}
        <button
          onClick={() => signIn("spotify", { callbackUrl: "/" })}
          className="text-[#f5f0e0]/20 text-xs hover:text-[#f5f0e0]/40 transition-colors"
        >
          Admin sign in
        </button>
      </div>
    </div>
  );
}
