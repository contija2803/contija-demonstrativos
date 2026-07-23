import { prisma } from "@/lib/prisma";
import type { DemonstrativoView } from "@/components/DemonstrativoDocument";
import { HistoricoList } from "@/components/HistoricoList";

export default async function HistoricoPage() {
  const historicos = await prisma.historico.findMany({
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
      <h2>Histórico de demonstrativos</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        Organizado por mês de geração. Clique em &quot;Ver&quot; para reabrir um demonstrativo já salvo.
      </div>
      <HistoricoList itens={itens} />
    </div>
  );
}
