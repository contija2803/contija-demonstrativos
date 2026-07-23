import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DemonstrativoView } from "@/components/DemonstrativoDocument";
import { HistoricoList } from "@/components/HistoricoList";

export default async function HistoricoPage() {
  const session = await getServerSession(authOptions);
  const isCliente = session?.user?.role === "CLIENTE";

  const historicos = await prisma.historico.findMany({
    where: isCliente ? { clienteId: session?.user?.clienteId ?? "__none__" } : undefined,
    orderBy: { dataGeracao: "desc" },
    include: { createdByUser: { select: { name: true } } },
  });

  const itens = historicos.map((h) => ({
    id: h.id,
    clienteNome: h.clienteNomeSnap,
    profissional: h.profissionalSnap,
    regime: h.regimeSnap,
    dataGeracao: h.dataGeracao.toISOString(),
    criadoPor: h.createdByUser?.name ?? null,
    valorATransferir: (h.resultadoJson as unknown as DemonstrativoView).resultado.valorATransferir,
  }));

  return (
    <div className="card">
      <h2>{isCliente ? "Meu histórico de demonstrativos" : "Histórico de demonstrativos"}</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        Organizado por mês de geração. Clique em &quot;Ver&quot; para reabrir um demonstrativo já salvo.
      </div>
      <HistoricoList itens={itens} canDelete={!isCliente} />
    </div>
  );
}
