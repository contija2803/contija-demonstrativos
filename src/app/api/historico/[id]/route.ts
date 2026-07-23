import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const historico = await prisma.historico.findUnique({
    where: { id },
    include: { createdByUser: { select: { name: true } } },
  });
  if (!historico) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: historico.id,
    dataGeracao: historico.dataGeracao.toISOString(),
    criadoPor: historico.createdByUser?.name ?? null,
    resultadoJson: historico.resultadoJson,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.$transaction(async (tx) => {
    // Notas vinculadas voltam a ficar pendentes, disponíveis para um próximo demonstrativo.
    await tx.notaFiscal.updateMany({
      where: { historicoId: id },
      data: { status: "PENDENTE", historicoId: null },
    });
    await tx.historico.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
