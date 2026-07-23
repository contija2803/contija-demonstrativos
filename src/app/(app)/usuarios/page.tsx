import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsuariosManager } from "@/components/UsuariosManager";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(session?.user?.role === "CLIENTE" ? "/historico" : "/gerar");

  const [users, clientesLista] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        clienteId: true,
        cliente: { select: { empresa: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cliente.findMany({ select: { id: true, empresa: true }, orderBy: { empresa: "asc" } }),
  ]);

  return (
    <UsuariosManager
      initialUsers={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        clienteId: u.clienteId,
        clienteEmpresa: u.cliente?.empresa ?? null,
      }))}
      currentUserId={session.user.id}
      clientesLista={clientesLista}
    />
  );
}
