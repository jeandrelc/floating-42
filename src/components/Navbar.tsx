"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Trophy, Clock, History, Settings } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const navLinks = [
    { href: "/", label: "This Week" },
    { href: "/vote", label: "Vote" },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2a2a45] bg-[#0f0f1e]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/playlist-cover.jpeg"
            alt="Floating 42.0"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "Fredoka, sans-serif" }}
          >
            <span className="text-[#f5841f]">Floating</span>{" "}
            <span className="text-[#f5f0e0]">42.0</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                pathname === href
                  ? "bg-[#f5841f]/20 text-[#f5841f]"
                  : "text-[#f5f0e0]/70 hover:text-[#f5f0e0] hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
          {session?.user.isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 ${
                pathname === "/admin"
                  ? "bg-[#a259c4]/20 text-[#a259c4]"
                  : "text-[#f5f0e0]/70 hover:text-[#f5f0e0] hover:bg-white/5"
              }`}
            >
              <Settings size={14} />
              Admin
            </Link>
          )}
        </div>

        {/* User */}
        {session ? (
          <div className="flex items-center gap-3 shrink-0">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-[#f5841f]/40"
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-[#f5f0e0]/50 hover:text-[#f5f0e0] transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[#f5841f] text-white hover:bg-[#f9a94e] transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
