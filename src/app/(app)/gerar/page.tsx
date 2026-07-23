import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClienteSelector } from "@/components/ClienteSelector";

export default async function GerarPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") redirect("/historico");

  const clientes = await prisma.cliente.findMany({
    select: { id: true, empresa: true },
    orderBy: { empresa: "asc" },
  });

  return (
    <div className="card">
      <h2>1. Cliente</h2>
      <ClienteSelector clientes={clientes} />
    </div>
  );
}
