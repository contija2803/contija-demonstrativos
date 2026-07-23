import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Bloqueia usuários com papel CLIENTE (acesso somente-leitura ao próprio histórico). */
export async function requireStaffOrAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "CLIENTE") return null;
  return session;
}
