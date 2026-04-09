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
  session: { strategy: "jwt" },
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

        const user = await prisma.user.findFirst({ where: { name } });
        if (!user) throw new Error("InvalidUsername");
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "spotify" && account.providerAccountId) {
        const isAdmin =
          !!process.env.ADMIN_SPOTIFY_ID &&
          account.providerAccountId === process.env.ADMIN_SPOTIFY_ID;
        await prisma.user.updateMany({
          where: { id: user!.id! },
          data: {
            spotifyId: account.providerAccountId,
            ...(isAdmin ? { isAdmin: true } : {}),
          },
        });
        token.spotifyId = account.providerAccountId;
        token.isAdmin = isAdmin;
      }
      // Refresh isAdmin/spotifyId from DB on first sign-in for credentials users
      if (user && !account?.provider) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { isAdmin: true, spotifyId: true },
        });
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.spotifyId = dbUser?.spotifyId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.spotifyId = (token.spotifyId as string) ?? null;
      }
      return session;
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
