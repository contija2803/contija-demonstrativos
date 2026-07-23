"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClienteJSON, NotaFiscalJSON } from "@/lib/serialize";
import { calcularDemonstrativosPorSocio, type ResultadoPorSocio } from "@/lib/calculo/tributos";
import { brl } from "@/lib/format";
import { NfUploadDropzone } from "./NfUploadDropzone";
import { NfTable } from "./NfTable";
import { DemonstrativoDocument } from "./DemonstrativoDocument";
import { PrintButton } from "./PrintButton";
import { ExportExcelButton } from "./ExportExcelButton";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface CustoSessao {
  id: string;
  desc: string;
  valor: number;
  incluido: boolean;
}

interface Props {
  cliente: ClienteJSON;
  initialNotas: NotaFiscalJSON[];
  clientesLista: { id: string; empresa: string }[];
}

export function GerarWorkspace({ cliente, initialNotas, clientesLista }: Props) {
  const router = useRouter();

  const [notas, setNotas] = useState<NotaFiscalJSON[]>(initialNotas);
  const [custosSessao, setCustosSessao] = useState<CustoSessao[]>(
    cliente.custosFixos.map((cf) => ({ id: cf.id, desc: cf.desc, valor: cf.valor, incluido: true }))
  );
  const [aliquotaInline, setAliquotaInline] = useState(cliente.aliquotaSimplesMensal?.toString() ?? "");
  const [resultados, setResultados] = useState<ResultadoPorSocio[] | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const isSimples = cliente.regime === "SIMPLES";
  const multiSocio = cliente.socios.length > 1;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  async function handleUpdateNf(id: string, field: string, value: string | number | boolean | null) {
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
    setResultados(null);
    try {
      await fetch(`/api/notas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // falha silenciosa: a edição fica só localmente até uma próxima ação bem-sucedida
    }
  }

  async function handleRemoveNf(id: string) {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    setResultados(null);
    await fetch(`/api/notas/${id}`, { method: "DELETE" });
  }

  function handleNfAdded(added: NotaFiscalJSON[]) {
    setNotas((prev) => [...prev, ...added]);
  }

  async function addManualNf() {
    const draft = {
      tomador: "",
      prestador: "",
      numero: "",
      data: "",
      valorBruto: 0,
      irRetPct: 1.5,
      issRetPct: 3,
      incluido: true,
      origem: "NOVO" as const,
      cancelada: false,
    };
    const res = await fetch(`/api/clientes/${cliente.id}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: [draft] }),
    });
    if (res.ok) {
      const created: NotaFiscalJSON[] = await res.json();
      setNotas((prev) => [...prev, ...created]);
    } else {
      showToast("Não foi possível adicionar a NF.");
    }
  }

  function addCustoSessaoExtra() {
    setCustosSessao((prev) => [...prev, { id: uid(), desc: "", valor: 0, incluido: true }]);
  }

  function updateCustoSessao(id: string, field: keyof CustoSessao, value: string | number | boolean) {
    setCustosSessao((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    setResultados(null);
  }

  function removeCustoSessao(id: string) {
    setCustosSessao((prev) => prev.filter((c) => c.id !== id));
    setResultados(null);
  }

  const totalCustosSessao = custosSessao.filter((c) => c.incluido).reduce((s, c) => s + (c.valor || 0), 0);

  async function atualizarAliquotaSimples() {
    const valor = parseFloat(aliquotaInline) || 0;
    if (valor <= 0) {
      showToast("Informe uma alíquota válida.");
      return;
    }
    const res = await fetch(`/api/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa: cliente.empresa,
        regime: cliente.regime,
        aliquotaSimplesMensal: valor,
        custosFixos: cliente.custosFixos.map((cf) => ({ desc: cf.desc, valor: cf.valor })),
        socios: cliente.socios.map((s) => ({ id: s.id, nome: s.nome })),
      }),
    });
    if (res.ok) {
      cliente.aliquotaSimplesMensal = valor;
      showToast("Alíquota mensal atualizada.");
    } else {
      showToast("Não foi possível atualizar a alíquota.");
    }
  }

  function handleCalcular() {
    const selecionadas = notas.filter((n) => n.incluido);
    if (!selecionadas.length) {
      showToast('Marque "Incluir" em ao menos uma NF para gerar o demonstrativo.');
      return;
    }

    const semSocio = selecionadas.filter((n) => !n.socioId).length;

    const custosAtivos = custosSessao
      .filter((c) => c.incluido)
      .map((c, i) => ({ id: String(i), desc: c.desc, valor: c.valor }));

    const grupos = cliente.socios.map((s) => ({
      socioId: s.id,
      socioNome: s.nome,
      notas: selecionadas
        .filter((n) => n.socioId === s.id)
        .map((n) => ({
          id: n.id,
          tomador: n.tomador,
          numero: n.numero,
          valorBruto: n.valorBruto,
          irRetPct: n.irRetPct,
          issRetPct: n.issRetPct,
        })),
    }));

    const calculados = calcularDemonstrativosPorSocio(
      { regime: cliente.regime, aliquotaSimplesMensal: cliente.aliquotaSimplesMensal },
      grupos,
      custosAtivos,
      cliente.socios.length
    );

    if (!calculados.length) {
      showToast("Nenhuma NF incluída tem sócio identificado — atribua um sócio na tabela antes de calcular.");
      return;
    }

    setResultados(calculados);
    if (semSocio > 0) {
      showToast(`${semSocio} NF(s) sem sócio identificado ficaram de fora — atribua um sócio e calcule de novo.`);
    }
  }

  async function handleSalvarHistorico() {
    if (!resultados || !resultados.length) return;

    setSaving(true);
    try {
      for (const r of resultados) {
        const res = await fetch("/api/historico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clienteId: cliente.id,
            socioId: r.socioId,
            notaIds: r.resultado.linhas.map((l) => l.notaFiscalId),
            custosUsados: r.custosUsados,
          }),
        });
        if (!res.ok) throw new Error();
      }

      const idsIncluidas = new Set(resultados.flatMap((r) => r.resultado.linhas.map((l) => l.notaFiscalId)));
      setNotas((prev) =>
        prev.filter((n) => !idsIncluidas.has(n.id)).map((n) => ({ ...n, origem: "PENDENTE_ANTERIOR" as const }))
      );
      setResultados(null);
      showToast("Demonstrativo(s) salvos no histórico. As notas não incluídas ficaram pendentes.");
    } catch {
      showToast("Não foi possível salvar um ou mais demonstrativos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card no-print">
        <h2>1. Cliente</h2>
        <div className="row">
          <div className="field" style={{ minWidth: 260 }}>
            <label>Selecionar cliente cadastrado</label>
            <select
              defaultValue={cliente.id}
              onChange={(e) => {
                if (e.target.value) router.push(`/gerar/${e.target.value}`);
              }}
            >
              {clientesLista.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresa}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="note">
          <b>{cliente.empresa}</b>{" "}
          <span className={`tag ${isSimples ? "simples" : "presumido"}`}>
            {isSimples ? "Simples Nacional" : "Lucro Presumido"}
          </span>
          <br />
          Sócios: {cliente.socios.map((s) => s.nome).join(", ") || "—"}
          <br />
          Custo fixo mensal cadastrado: {brl(cliente.custosFixos.reduce((s, cf) => s + cf.valor, 0))}
          {multiSocio && ` (dividido igualmente entre os ${cliente.socios.length} sócios)`}
          {isSimples && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--navy-dark)" }}>
                Alíquota mensal atual:
              </label>
              <input
                type="number"
                step="0.01"
                style={{ width: 90 }}
                value={aliquotaInline}
                onChange={(e) => setAliquotaInline(e.target.value)}
              />
              <span>%</span>
              <button className="btn ghost small" onClick={atualizarAliquotaSimples}>
                Salvar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card no-print">
        <h2>2. Notas Fiscais</h2>
        <NfUploadDropzone clienteId={cliente.id} onAdded={handleNfAdded} />
        <div style={{ marginTop: 12 }}>
          <button className="btn ghost small" onClick={addManualNf}>
            + Adicionar NF manualmente
          </button>
        </div>
        <NfTable
          notas={notas}
          isSimples={isSimples}
          socios={cliente.socios}
          onUpdate={handleUpdateNf}
          onRemove={handleRemoveNf}
        />
      </div>

      {notas.length > 0 && (
        <div className="card no-print">
          <h2>3. Custos fixos deste demonstrativo</h2>
          <div className="hint" style={{ marginBottom: 10 }}>
            Marque só o que deve ser descontado neste demonstrativo. Dá para editar valores, desmarcar itens ou
            lançar um custo extra que não fica salvo no cadastro do cliente.
            {multiSocio && " O valor é dividido igualmente entre todos os sócios cadastrados."}
          </div>
          {custosSessao.length === 0 ? (
            <div className="empty">Nenhum custo fixo cadastrado para este cliente. Adicione um extra se precisar.</div>
          ) : (
            custosSessao.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={c.incluido}
                  onChange={(e) => updateCustoSessao(c.id, "incluido", e.target.checked)}
                  title="Incluir neste demonstrativo"
                />
                <input
                  placeholder="Descrição"
                  style={{ flex: 2 }}
                  value={c.desc}
                  onChange={(e) => updateCustoSessao(c.id, "desc", e.target.value)}
                />
                <input
                  placeholder="Valor"
                  type="number"
                  step="0.01"
                  style={{ width: 120 }}
                  value={c.valor}
                  onChange={(e) => updateCustoSessao(c.id, "valor", parseFloat(e.target.value) || 0)}
                />
                <button className="btn danger" onClick={() => removeCustoSessao(c.id)}>
                  Remover
                </button>
              </div>
            ))
          )}
          <button className="btn ghost small" onClick={addCustoSessaoExtra}>
            + Adicionar custo extra (só para este demonstrativo)
          </button>
          <div className="note" style={{ marginTop: 12 }}>
            Total a descontar neste demonstrativo: <b>{brl(totalCustosSessao)}</b>
            {multiSocio && ` (${brl(totalCustosSessao / cliente.socios.length)} por sócio)`}
          </div>
        </div>
      )}

      {notas.length > 0 && (
        <div className="card">
          <div className="no-print">
            <h2>4. Demonstrativo</h2>
            <div className="actions-bar">
              <button className="btn orange" onClick={handleCalcular}>
                Calcular demonstrativo
              </button>
            </div>
          </div>

          {resultados && resultados.length > 0 && (
            <>
              {resultados.map((r) => {
                const clienteInfo = {
                  empresa: cliente.empresa,
                  profissional: r.socioNome,
                  regime: cliente.regime,
                  aliquotaSimplesMensal: cliente.aliquotaSimplesMensal,
                };
                return (
                  <div key={r.socioId} style={{ marginBottom: 20 }}>
                    <DemonstrativoDocument cliente={clienteInfo} resultado={r.resultado} custosUsados={r.custosUsados} />
                    <div className="actions-bar no-print">
                      <PrintButton />
                      <ExportExcelButton
                        cliente={clienteInfo}
                        resultado={r.resultado}
                        custosUsados={r.custosUsados}
                        nomeArquivoBase={`${cliente.empresa}_${r.socioNome}`}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="actions-bar no-print">
                <button className="btn orange" onClick={handleSalvarHistorico} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar no histórico"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {toast && <div className="toast show no-print">{toast}</div>}
    </>
  );
}
