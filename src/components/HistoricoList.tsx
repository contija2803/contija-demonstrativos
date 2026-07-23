"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";

export interface HistoricoItem {
  id: string;
  clienteNome: string;
  profissional: string;
  regime: "PRESUMIDO" | "SIMPLES";
  dataGeracao: string;
  criadoPor: string | null;
  valorATransferir: number;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function HistoricoList({ itens: itensIniciais }: { itens: HistoricoItem[] }) {
  const router = useRouter();
  const [itens, setItens] = useState(itensIniciais);

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este demonstrativo do histórico? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/historico/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItens((prev) => prev.filter((i) => i.id !== id));
    }
  }

  if (!itens.length) {
    return <div className="empty">Nenhum demonstrativo salvo ainda.</div>;
  }

  const grupos = new Map<string, HistoricoItem[]>();
  for (const item of itens) {
    const d = new Date(item.dataGeracao);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(item);
  }
  const chaves = Array.from(grupos.keys()).sort().reverse();

  return (
    <>
      {chaves.map((key) => {
        const [ano, mes] = key.split("-");
        const label = `${MESES[parseInt(mes, 10) - 1]} de ${ano}`;
        const grupo = grupos
          .get(key)!
          .slice()
          .sort((a, b) => new Date(b.dataGeracao).getTime() - new Date(a.dataGeracao).getTime());

        return (
          <div key={key}>
            <h3 style={{ textTransform: "capitalize" }}>{label}</h3>
            <table style={{ marginBottom: 18 }}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Regime</th>
                  <th>Valor a transferir</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grupo.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.dataGeracao).toLocaleDateString("pt-BR")}</td>
                    <td>
                      {h.clienteNome}
                      {h.profissional ? ` — ${h.profissional}` : ""}
                    </td>
                    <td>{h.regime === "SIMPLES" ? "Simples" : "Presumido"}</td>
                    <td className="num">{brl(h.valorATransferir)}</td>
                    <td>
                      <button className="btn ghost small" onClick={() => router.push(`/historico/${h.id}`)}>
                        Ver
                      </button>{" "}
                      <button className="btn danger" onClick={() => handleExcluir(h.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
