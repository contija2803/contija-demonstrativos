import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notasFiscaisBatchSchema } from "@/lib/validation/nota";
import { serializeNotaFiscal } from "@/lib/serialize";
import { requireStaffOrAdmin } from "@/lib/requireStaff";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notas = await prisma.notaFiscal.findMany({
    where: { clienteId: id, status: "PENDENTE" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(notas.map(serializeNotaFiscal));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffOrAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = notasFiscaisBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const notas = await prisma.$transaction(
    parsed.data.notas.map((n) =>
      prisma.notaFiscal.create({
        data: { ...n, clienteId: id },
      })
    )
  );

  return NextResponse.json(notas.map(serializeNotaFiscal), { status: 201 });
}
