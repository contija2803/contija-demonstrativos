"use client";

import type { NotaFiscalJSON } from "@/lib/serialize";

interface Props {
  notas: NotaFiscalJSON[];
  isSimples: boolean;
  onUpdate: (id: string, field: string, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
}

export function NfTable({ notas, isSimples, onUpdate, onRemove }: Props) {
  if (!notas.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <table>
        <thead>
          <tr>
            <th>Incluir</th>
            <th>Unidade/Tomador</th>
            <th>Nº NF</th>
            <th>Data</th>
            <th>Valor bruto</th>
            <th>{isSimples ? "% ISS retido na nota" : "% IR retido na nota"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {notas.map((n) => (
            <tr key={n.id}>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={n.incluido}
                  onChange={(e) => onUpdate(n.id, "incluido", e.target.checked)}
                  title="Incluir neste demonstrativo"
                />
              </td>
              <td>
                <input
                  style={{ width: 150 }}
                  value={n.tomador}
                  onChange={(e) => onUpdate(n.id, "tomador", e.target.value)}
                />
                {n.origem === "PENDENTE_ANTERIOR" && (
                  <div className="hint">pendente de demonstrativo anterior</div>
                )}
                {n.cancelada && (
                  <div className="hint" style={{ color: "#8a3a12" }}>
                    ⚠ possível NF cancelada — confira antes de incluir
                  </div>
                )}
              </td>
              <td>
                <input
                  style={{ width: 70 }}
                  value={n.numero}
                  onChange={(e) => onUpdate(n.id, "numero", e.target.value)}
                />
              </td>
              <td>
                <input
                  style={{ width: 90 }}
                  value={n.data}
                  onChange={(e) => onUpdate(n.id, "data", e.target.value)}
                />
              </td>
              <td>
                <input
                  style={{ width: 100 }}
                  type="number"
                  step="0.01"
                  value={n.valorBruto}
                  onChange={(e) => onUpdate(n.id, "valorBruto", parseFloat(e.target.value) || 0)}
                />
              </td>
              <td>
                {isSimples ? (
                  <input
                    style={{ width: 70 }}
                    type="number"
                    step="0.01"
                    value={n.issRetPct ?? 0}
                    onChange={(e) => onUpdate(n.id, "issRetPct", parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <input
                    style={{ width: 70 }}
                    type="number"
                    step="0.1"
                    value={n.irRetPct ?? 0}
                    onChange={(e) => onUpdate(n.id, "irRetPct", parseFloat(e.target.value) || 0)}
                  />
                )}
              </td>
              <td>
                <button className="btn danger" onClick={() => onRemove(n.id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hint" style={{ marginTop: 8 }}>
        Desmarque &quot;Incluir&quot; nas notas que devem ficar pendentes para um próximo demonstrativo — elas continuam salvas para este cliente.
      </div>
    </div>
  );
}
