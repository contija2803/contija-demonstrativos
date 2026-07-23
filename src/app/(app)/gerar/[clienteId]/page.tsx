import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCliente, serializeNotaFiscal } from "@/lib/serialize";
import { GerarWorkspace } from "@/components/GerarWorkspace";

export default async function GerarClientePage({ params }: { params: Promise<{ clienteId: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") redirect("/historico");

  const { clienteId } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { custosFixos: true },
  });
  if (!cliente) notFound();

  const notasPendentes = await prisma.notaFiscal.findMany({
    where: { clienteId, status: "PENDENTE" },
    orderBy: { createdAt: "asc" },
  });

  const clientesLista = await prisma.cliente.findMany({
    select: { id: true, empresa: true, profissional: true },
    orderBy: { empresa: "asc" },
  });

  return (
    <GerarWorkspace
      cliente={serializeCliente(cliente)}
      initialNotas={notasPendentes.map(serializeNotaFiscal)}
      clientesLista={clientesLista}
    />
  );
}
