"use client";

import { useRouter } from "next/navigation";

export function HistoricoDetalheActions() {
  const router = useRouter();

  return (
    <button className="btn ghost" onClick={() => router.push("/historico")}>
      Fechar
    </button>
  );
}
