import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";

//hi

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const week = await prisma.week.findFirst({
    orderBy: { number: "desc" },
    include: {
      songs: true,
      votes: { select: { songId: true } },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, image: true, spotifyId: true, isAdmin: true },
    orderBy: { name: "asc" },
  });

  return <AdminPanel currentWeek={week} allUsers={allUsers} />;
}
