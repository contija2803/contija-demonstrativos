import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notaFiscalPatchSchema } from "@/lib/validation/nota";
import { serializeNotaFiscal } from "@/lib/serialize";
import { requireStaffOrAdmin } from "@/lib/requireStaff";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffOrAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = notaFiscalPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nota = await prisma.notaFiscal.update({ where: { id }, data: parsed.data });
  return NextResponse.json(serializeNotaFiscal(nota));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireStaffOrAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  await prisma.notaFiscal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
