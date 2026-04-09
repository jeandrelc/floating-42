import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-collaborative",
  "playlist-read-private",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  logger: {
    error: (e) => console.error("[NextAuth] error:", e),
    warn: (code) => console.warn("[NextAuth] warn:", code),
    debug: (msg, meta) => console.log("[NextAuth] debug:", msg, JSON.stringify(meta)),
  },
  basePath: "/api/auth",
  providers: [
    Credentials({
      credentials: {
        name: { label: "Display Name" },
        code: { label: "Invite Code" },
      },
      async authorize(credentials) {
        const code = credentials.code as string;
        const name = (credentials.name as string)?.trim();
        if (!code || !name) return null;
        if (code !== process.env.INVITE_CODE) return null;

        let user = await prisma.user.findFirst({ where: { name } });
        if (!user) {
          user = await prisma.user.create({ data: { name } });
        }
        return user;
      },
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: SPOTIFY_SCOPES,
          redirect_uri: `${process.env.AUTH_URL}/api/auth/callback/spotify`,
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true, spotifyId: true },
        });
        session.user.isAdmin = dbUser?.isAdmin ?? false;
        session.user.spotifyId = dbUser?.spotifyId ?? null;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "spotify" && account.providerAccountId) {
        const isAdmin =
          !!process.env.ADMIN_SPOTIFY_ID &&
          account.providerAccountId === process.env.ADMIN_SPOTIFY_ID;
        // updateMany silently does nothing for new users (not in DB yet);
        // spotifyId and isAdmin will be set correctly on their next sign-in.
        await prisma.user.updateMany({
          where: { id: user.id! },
          data: {
            spotifyId: account.providerAccountId,
            ...(isAdmin ? { isAdmin: true } : {}),
          },
        });
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      spotifyId: string | null;
    };
  }
}
