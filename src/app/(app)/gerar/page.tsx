import { prisma } from "@/lib/prisma";
import { ClienteSelector } from "@/components/ClienteSelector";

export default async function GerarPage() {
  const clientes = await prisma.cliente.findMany({
    select: { id: true, empresa: true, profissional: true },
    orderBy: { empresa: "asc" },
  });

  return (
    <div className="card">
      <h2>1. Cliente</h2>
      <ClienteSelector clientes={clientes} />
    </div>
  );
}
