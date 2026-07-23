import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Rota de bootstrap de uso único: cria o primeiro usuário ADMIN quando o banco
 * ainda não tem nenhum usuário. Existe só porque as variáveis de conexão do
 * banco de produção vêm marcadas "Sensitive" pela integração Neon da Vercel e
 * não podem ser reveladas para rodar `prisma db seed` localmente. Remover
 * depois do primeiro uso.
 */
export async function POST(req: NextRequest) {
  const existentes = await prisma.user.count();
  if (existentes > 0) {
    return NextResponse.json({ error: "Já existe usuário cadastrado. Bootstrap não é mais necessário." }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password } = body ?? {};
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email e password são obrigatórios" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}
