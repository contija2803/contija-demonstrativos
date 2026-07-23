import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCliente } from "@/lib/serialize";
import { ClientesManager } from "@/components/ClientesManager";

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") redirect("/historico");

  const clientes = await prisma.cliente.findMany({
    include: { custosFixos: true, socios: { where: { ativo: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { empresa: "asc" },
  });

  return <ClientesManager initialClientes={clientes.map(serializeCliente)} />;
}
