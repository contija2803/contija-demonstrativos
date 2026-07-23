import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DemonstrativoView } from "@/components/DemonstrativoDocument";
import { DemonstrativoDocument } from "@/components/DemonstrativoDocument";
import { PrintButton } from "@/components/PrintButton";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { HistoricoDetalheActions } from "@/components/HistoricoDetalheActions";

export default async function HistoricoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const historico = await prisma.historico.findUnique({ where: { id } });
  if (!historico) notFound();
  if (session?.user?.role === "CLIENTE" && historico.clienteId !== session.user.clienteId) notFound();

  const view = historico.resultadoJson as unknown as DemonstrativoView;

  return (
    <div className="card">
      <h2 className="no-print">Demonstrativo salvo</h2>
      <DemonstrativoDocument cliente={view.cliente} resultado={view.resultado} custosUsados={view.custosUsados} />
      <div className="actions-bar no-print" style={{ marginTop: 14 }}>
        <HistoricoDetalheActions />
        <PrintButton />
        <ExportExcelButton cliente={view.cliente} resultado={view.resultado} custosUsados={view.custosUsados} nomeArquivoBase={view.cliente.empresa} />
      </div>
    </div>
  );
}
