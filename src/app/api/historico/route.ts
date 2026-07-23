import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { salvarHistoricoSchema } from "@/lib/validation/historico";
import {
  calcularDemonstrativo,
  agruparPessoasFisicas,
  type ClienteCalcInput,
  type NotaFiscalCalcInput,
} from "@/lib/calculo/tributos";
import type { DemonstrativoView } from "@/components/DemonstrativoDocument";

export async function GET() {
  const session = await getServerSession(authOptions);
  const isCliente = session?.user?.role === "CLIENTE";

  const historicos = await prisma.historico.findMany({
    where: isCliente ? { clienteId: session?.user?.clienteId ?? "__none__" } : undefined,
    orderBy: { dataGeracao: "desc" },
    include: { createdByUser: { select: { name: true } } },
  });

  return NextResponse.json(
    historicos.map((h) => ({
      id: h.id,
      clienteId: h.clienteId,
      clienteNome: h.clienteNomeSnap,
      profissional: h.profissionalSnap,
      regime: h.regimeSnap,
      dataGeracao: h.dataGeracao.toISOString(),
      criadoPor: h.createdByUser?.name ?? null,
      valorATransferir: (h.resultadoJson as unknown as DemonstrativoView).resultado.valorATransferir,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = salvarHistoricoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { clienteId, socioId, notaIds, custosUsados } = parsed.data;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const socio = await prisma.socio.findFirst({ where: { id: socioId, clienteId } });
  if (!socio) return NextResponse.json({ error: "Sócio não encontrado para este cliente." }, { status: 404 });

  const notasRows = await prisma.notaFiscal.findMany({
    where: { id: { in: notaIds }, clienteId, socioId, status: "PENDENTE" },
  });
  const notasById = new Map(notasRows.map((n) => [n.id, n]));
  const notasOrdenadas = notaIds.map((id) => notasById.get(id)).filter((n): n is NonNullable<typeof n> => !!n);

  if (!notasOrdenadas.length) {
    return NextResponse.json({ error: "Nenhuma nota fiscal pendente válida foi encontrada para este sócio." }, { status: 400 });
  }

  const clienteCalc: ClienteCalcInput = {
    regime: cliente.regime,
    aliquotaSimplesMensal: cliente.aliquotaSimplesMensal ? Number(cliente.aliquotaSimplesMensal) : null,
  };
  const notasCalc: NotaFiscalCalcInput[] = notasOrdenadas.map((n) => ({
    id: n.id,
    tomador: n.tomador,
    numero: n.numero,
    valorBruto: Number(n.valorBruto),
    irRetPct: n.irRetPct !== null ? Number(n.irRetPct) : null,
    issRetPct: n.issRetPct !== null ? Number(n.issRetPct) : null,
    tipoTomador: n.tipoTomador,
  }));
  const custosFixosCalc = custosUsados.map((cf, i) => ({ id: String(i), desc: cf.desc, valor: cf.valor }));

  const resultado = agruparPessoasFisicas(calcularDemonstrativo(clienteCalc, notasCalc, custosFixosCalc));

  const resultadoJson: DemonstrativoView = {
    cliente: {
      empresa: cliente.empresa,
      profissional: socio.nome,
      regime: cliente.regime,
      aliquotaSimplesMensal: clienteCalc.aliquotaSimplesMensal ?? null,
    },
    resultado,
    custosUsados,
  };

  const historico = await prisma.$transaction(async (tx) => {
    const created = await tx.historico.create({
      data: {
        clienteId: cliente.id,
        socioId: socio.id,
        clienteNomeSnap: cliente.empresa,
        profissionalSnap: socio.nome,
        regimeSnap: cliente.regime,
        resultadoJson: JSON.parse(JSON.stringify(resultadoJson)),
        createdByUserId: session?.user?.id ?? null,
      },
    });

    await tx.notaFiscal.updateMany({
      where: { id: { in: notasOrdenadas.map((n) => n.id) } },
      data: { status: "INCLUIDA", historicoId: created.id },
    });

    // Notas não incluídas neste demonstrativo ficam pendentes para o próximo.
    await tx.notaFiscal.updateMany({
      where: { clienteId: cliente.id, status: "PENDENTE" },
      data: { origem: "PENDENTE_ANTERIOR" },
    });

    return created;
  });

  return NextResponse.json({ id: historico.id }, { status: 201 });
}
