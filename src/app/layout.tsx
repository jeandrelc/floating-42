import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Floating 42.0",
  description: "The ultimate weekly playlist battle",
  icons: { icon: "/playlist-cover.jpeg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0f0f1e] text-[#f5f0e0]">
        <SessionProvider session={session}>
          <Navbar />
          <main className="flex-1 pb-16 sm:pb-0">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
