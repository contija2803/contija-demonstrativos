import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteInputSchema } from "@/lib/validation/cliente";
import { serializeCliente } from "@/lib/serialize";
import { requireStaffOrAdmin } from "@/lib/requireStaff";

const INCLUDE = { custosFixos: true, socios: { where: { ativo: true }, orderBy: { createdAt: "asc" as const } } };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id }, include: INCLUDE });
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  return NextResponse.json(serializeCliente(cliente));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffOrAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = clienteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { custosFixos, socios, ...clienteData } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.custoFixo.deleteMany({ where: { clienteId: id } });
    if (custosFixos.length) {
      await tx.custoFixo.createMany({ data: custosFixos.map((cf) => ({ ...cf, clienteId: id })) });
    }

    // Sócios são referenciados por notas/histórico, então nunca são apagados de
    // fato: os que saíram da lista ficam inativos, preservando o histórico.
    const existentes = await tx.socio.findMany({ where: { clienteId: id } });
    const idsRecebidos = new Set(socios.filter((s) => s.id).map((s) => s.id));
    const paraDesativar = existentes.filter((e) => e.ativo && !idsRecebidos.has(e.id));
    if (paraDesativar.length) {
      await tx.socio.updateMany({
        where: { id: { in: paraDesativar.map((s) => s.id) } },
        data: { ativo: false },
      });
    }

    for (const s of socios) {
      if (s.id) {
        await tx.socio.update({ where: { id: s.id }, data: { nome: s.nome, ativo: true } });
      } else {
        await tx.socio.create({ data: { clienteId: id, nome: s.nome } });
      }
    }

    await tx.cliente.update({ where: { id }, data: clienteData });
  });

  const cliente = await prisma.cliente.findUnique({ where: { id }, include: INCLUDE });
  return NextResponse.json(serializeCliente(cliente!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffOrAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
