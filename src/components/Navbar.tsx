"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Trophy, History, Settings, Music2, Vote } from "lucide-react";

const NAV_LINKS = [
  { href: "/",            label: "This Week",   icon: Music2   },
  { href: "/vote",        label: "Vote",        icon: Vote     },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy   },
  { href: "/history",     label: "History",     icon: History  },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const allLinks = [
    ...NAV_LINKS,
    ...(session?.user.isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="sticky top-0 z-50 border-b border-[#2a2a45] bg-[#0f0f1e]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/playlist-cover.jpeg"
              alt="Floating 42.0"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: "Fredoka, sans-serif" }}>
              <span className="text-[#f5841f]">Floating</span>{" "}
              <span className="text-[#f5f0e0]">42.0</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {allLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  pathname === href
                    ? href === "/admin"
                      ? "bg-[#a259c4]/20 text-[#a259c4]"
                      : "bg-[#f5841f]/20 text-[#f5841f]"
                    : "text-[#f5f0e0]/70 hover:text-[#f5f0e0] hover:bg-white/5"
                }`}
              >
                {label === "Admin" && <Settings size={14} className="inline mr-1 -mt-0.5" />}
                {label}
              </Link>
            ))}
          </div>

          {/* User */}
          {session ? (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  width={30}
                  height={30}
                  className="rounded-full ring-2 ring-[#f5841f]/40"
                />
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-[#f5f0e0]/50 hover:text-[#f5f0e0] transition-colors hidden sm:block"
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

      {/* ── Mobile bottom tab bar ── */}
      {session && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0f0f1e]/95 backdrop-blur-md border-t border-[#2a2a45]">
          <div className="flex items-stretch h-16">
            {allLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              const color = active
                ? href === "/admin" ? "#a259c4" : "#f5841f"
                : "#f5f0e0";
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-opacity"
                  style={{ opacity: active ? 1 : 0.4 }}
                >
                  <Icon size={20} style={{ color }} />
                  <span className="text-[10px] font-semibold" style={{ color }}>
                    {label}
                  </span>
                </Link>
              );
            })}
            {/* Sign out tucked at the end on mobile */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 opacity-30 hover:opacity-60 transition-opacity"
            >
              <span className="text-[10px] font-semibold text-[#f5f0e0]">Sign out</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
