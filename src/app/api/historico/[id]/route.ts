import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const historico = await prisma.historico.findUnique({
    where: { id },
    include: { createdByUser: { select: { name: true } } },
  });
  if (!historico) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (session?.user?.role === "CLIENTE" && historico.clienteId !== session.user.clienteId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: historico.id,
    dataGeracao: historico.dataGeracao.toISOString(),
    criadoPor: historico.createdByUser?.name ?? null,
    resultadoJson: historico.resultadoJson,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

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
