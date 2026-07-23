"use client";

import { useEffect, useState } from "react";
import type { ClienteJSON } from "@/lib/serialize";

interface CustoFixoDraft {
  desc: string;
  valor: number;
}

interface SocioDraft {
  id?: string;
  nome: string;
}

interface Props {
  initial: ClienteJSON | null;
  onSaved: (cliente: ClienteJSON) => void;
  onCancel: () => void;
}

function toDrafts(cliente: ClienteJSON | null): CustoFixoDraft[] {
  return cliente ? cliente.custosFixos.map((cf) => ({ desc: cf.desc, valor: cf.valor })) : [];
}

function toSocioDrafts(cliente: ClienteJSON | null): SocioDraft[] {
  return cliente && cliente.socios.length ? cliente.socios.map((s) => ({ id: s.id, nome: s.nome })) : [{ nome: "" }];
}

export function ClienteForm({ initial, onSaved, onCancel }: Props) {
  const [empresa, setEmpresa] = useState(initial?.empresa ?? "");
  const [socios, setSocios] = useState<SocioDraft[]>(toSocioDrafts(initial));
  const [regime, setRegime] = useState<"PRESUMIDO" | "SIMPLES">(initial?.regime ?? "PRESUMIDO");
  const [aliquotaSimplesMensal, setAliquotaSimplesMensal] = useState(
    initial?.aliquotaSimplesMensal?.toString() ?? ""
  );
  const [custosFixos, setCustosFixos] = useState<CustoFixoDraft[]>(toDrafts(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmpresa(initial?.empresa ?? "");
    setSocios(toSocioDrafts(initial));
    setRegime(initial?.regime ?? "PRESUMIDO");
    setAliquotaSimplesMensal(initial?.aliquotaSimplesMensal?.toString() ?? "");
    setCustosFixos(toDrafts(initial));
  }, [initial]);

  function updateCusto(index: number, field: keyof CustoFixoDraft, value: string) {
    setCustosFixos((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: field === "valor" ? Number(value) || 0 : value } : c))
    );
  }

  function removeCusto(index: number) {
    setCustosFixos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSocio(index: number, nome: string) {
    setSocios((prev) => prev.map((s, i) => (i === index ? { ...s, nome } : s)));
  }

  function removeSocio(index: number) {
    setSocios((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const sociosValidos = socios.filter((s) => s.nome.trim());

    if (!empresa.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (!sociosValidos.length) {
      setError("Cadastre ao menos um sócio.");
      return;
    }
    if (regime === "SIMPLES" && !(Number(aliquotaSimplesMensal) > 0)) {
      setError("Informe a alíquota mensal do Simples.");
      return;
    }

    setSaving(true);
    const payload = {
      empresa: empresa.trim(),
      regime,
      aliquotaSimplesMensal: regime === "SIMPLES" ? Number(aliquotaSimplesMensal) : null,
      custosFixos: custosFixos.filter((c) => c.desc.trim()),
      socios: sociosValidos.map((s) => ({ id: s.id, nome: s.nome.trim() })),
    };

    const url = initial ? `/api/clientes/${initial.id}` : "/api/clientes";
    const method = initial ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.formErrors?.join(", ") || "Não foi possível salvar o cliente.");
      }
      const cliente: ClienteJSON = await res.json();
      onSaved(cliente);
      if (!initial) {
        setEmpresa("");
        setSocios([{ nome: "" }]);
        setRegime("PRESUMIDO");
        setAliquotaSimplesMensal("");
        setCustosFixos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>{initial ? "Editar cliente" : "Novo cliente"}</h2>

      {error && <div className="note warn">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="field">
            <label>Nome da empresa (PJ)</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: ACBS SAÚDE LTDA" />
          </div>
          <div className="field">
            <label>Regime tributário</label>
            <select
              className="regime-select"
              value={regime}
              onChange={(e) => setRegime(e.target.value as "PRESUMIDO" | "SIMPLES")}
            >
              <option value="PRESUMIDO">Lucro Presumido</option>
              <option value="SIMPLES">Simples Nacional</option>
            </select>
          </div>
        </div>

        {regime === "SIMPLES" && (
          <div className="row">
            <div className="field">
              <label>Alíquota do Simples mensal atual (%)</label>
              <input
                type="number"
                step="0.01"
                value={aliquotaSimplesMensal}
                onChange={(e) => setAliquotaSimplesMensal(e.target.value)}
                placeholder="Ex.: 11.20"
              />
              <div className="hint">Informe a alíquota efetiva do DAS já calculada para este mês</div>
            </div>
          </div>
        )}

        <div className="note">
          {regime === "SIMPLES"
            ? "Provisão do Simples = alíquota mensal atual − o que já foi retido na própria NF (a diferença). Atualize a alíquota mensal sempre que a faixa do DAS mudar."
            : "Provisão de IRPJ (Presumido) = 4,8% menos a alíquota de IR já retida na própria nota (a diferença). Provisão de CSLL = 1,88% fixo (2,88% total − 1% já retido na fonte)."}
        </div>

        <h3>Sócios / profissionais</h3>
        <div className="hint" style={{ marginBottom: 8 }}>
          Se a empresa tiver mais de um sócio, o custo fixo mensal é dividido igualmente entre todos, e cada nota
          fiscal é atribuída ao sócio correspondente (detectado pela descrição da nota, ou escolhido manualmente).
        </div>
        {socios.map((s, i) => (
          <div className="custos-line" key={s.id ?? `novo-${i}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              placeholder="Ex.: Drª Ana Clara Barcelos"
              style={{ flex: 2 }}
              value={s.nome}
              onChange={(e) => updateSocio(i, e.target.value)}
            />
            {socios.length > 1 && (
              <button type="button" className="btn danger" onClick={() => removeSocio(i)}>
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => setSocios((prev) => [...prev, { nome: "" }])}>
          + Adicionar sócio
        </button>

        <h3>Custos fixos mensais</h3>
        {custosFixos.map((cf, i) => (
          <div className="custos-line" key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              placeholder="Descrição (ex.: Honorário contábil)"
              style={{ flex: 2 }}
              value={cf.desc}
              onChange={(e) => updateCusto(i, "desc", e.target.value)}
            />
            <input
              placeholder="Valor"
              type="number"
              step="0.01"
              style={{ width: 120 }}
              value={cf.valor}
              onChange={(e) => updateCusto(i, "valor", e.target.value)}
            />
            <button type="button" className="btn danger" onClick={() => removeCusto(i)}>
              Remover
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => setCustosFixos((prev) => [...prev, { desc: "", valor: 0 }])}>
          + Adicionar custo fixo
        </button>

        <div className="actions-bar">
          <button type="submit" className="btn orange" disabled={saving}>
            {saving ? "Salvando…" : "Salvar cliente"}
          </button>
          {initial && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
