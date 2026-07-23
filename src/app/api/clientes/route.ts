import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteInputSchema } from "@/lib/validation/cliente";
import { serializeCliente } from "@/lib/serialize";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    include: { custosFixos: true },
    orderBy: { empresa: "asc" },
  });
  return NextResponse.json(clientes.map(serializeCliente));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = clienteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { custosFixos, ...clienteData } = parsed.data;

  const cliente = await prisma.cliente.create({
    data: {
      ...clienteData,
      custosFixos: { create: custosFixos },
    },
    include: { custosFixos: true },
  });

  return NextResponse.json(serializeCliente(cliente), { status: 201 });
}
