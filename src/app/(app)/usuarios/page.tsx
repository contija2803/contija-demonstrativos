import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsuariosManager } from "@/components/UsuariosManager";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/gerar");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsuariosManager
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      currentUserId={session.user.id}
    />
  );
}
