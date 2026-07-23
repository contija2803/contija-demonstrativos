import { prisma } from "@/lib/prisma";
import { serializeCliente } from "@/lib/serialize";
import { ClientesManager } from "@/components/ClientesManager";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: { custosFixos: true },
    orderBy: { empresa: "asc" },
  });

  return <ClientesManager initialClientes={clientes.map(serializeCliente)} />;
}
