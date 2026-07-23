"use client";

import { useState } from "react";
import type { ClienteJSON } from "@/lib/serialize";
import { ClienteForm } from "./ClienteForm";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientesManager({ initialClientes }: { initialClientes: ClienteJSON[] }) {
  const [clientes, setClientes] = useState<ClienteJSON[]>(initialClientes);
  const [editing, setEditing] = useState<ClienteJSON | null>(null);

  function handleSaved(cliente: ClienteJSON) {
    setClientes((prev) => {
      const exists = prev.some((c) => c.id === cliente.id);
      const next = exists ? prev.map((c) => (c.id === cliente.id ? cliente : c)) : [...prev, cliente];
      return next.sort((a, b) => a.empresa.localeCompare(b.empresa));
    });
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClientes((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <>
      <ClienteForm initial={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />

      <div className="card">
        <h2>Clientes cadastrados</h2>
        {clientes.length === 0 ? (
          <div className="empty">Nenhum cliente cadastrado ainda.</div>
        ) : (
          <div className="clientes-list">
            {clientes.map((c) => {
              const totalCustos = c.custosFixos.reduce((s, cf) => s + cf.valor, 0);
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    marginBottom: 8,
                    background: "#fbfcfe",
                  }}
                >
                  <div>
                    <b style={{ display: "block", fontSize: 13.5 }}>
                      {c.empresa}
                      <span className={`tag ${c.regime === "SIMPLES" ? "simples" : "presumido"}`}>
                        {c.regime === "SIMPLES" ? "Simples Nacional" : "Lucro Presumido"}
                      </span>
                    </b>
                    <span style={{ fontSize: 11.5, color: "var(--gray)" }}>
                      {c.profissional || "—"} · Custo fixo mensal: {brl(totalCustos)}
                    </span>
                  </div>
                  <div>
                    <button className="btn ghost small" onClick={() => setEditing(c)}>
                      Editar
                    </button>{" "}
                    <button className="btn danger" onClick={() => handleDelete(c.id)}>
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
