import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteInputSchema } from "@/lib/validation/cliente";
import { serializeCliente } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { custosFixos: true },
  });
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  return NextResponse.json(serializeCliente(cliente));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = clienteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { custosFixos, ...clienteData } = parsed.data;

  const cliente = await prisma.$transaction(async (tx) => {
    await tx.custoFixo.deleteMany({ where: { clienteId: id } });
    return tx.cliente.update({
      where: { id },
      data: {
        ...clienteData,
        custosFixos: { create: custosFixos },
      },
      include: { custosFixos: true },
    });
  });

  return NextResponse.json(serializeCliente(cliente));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
