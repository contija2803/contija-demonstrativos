import type { ResultadoCalculo } from "@/lib/calculo/tributos";
import { brl, pct } from "@/lib/format";
import Image from "next/image";

export interface DemonstrativoClienteInfo {
  empresa: string;
  profissional: string;
  regime: "PRESUMIDO" | "SIMPLES";
  aliquotaSimplesMensal: number | null;
}

export interface DemonstrativoView {
  cliente: DemonstrativoClienteInfo;
  resultado: ResultadoCalculo;
  custosUsados: { desc: string; valor: number }[];
}

export function DemonstrativoDocument({ cliente, resultado: r, custosUsados }: DemonstrativoView) {
  const isSimples = cliente.regime === "SIMPLES";

  return (
    <div className="doc" id="demoDoc">
      <div className="doc-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: "4px 8px" }}>
            <Image src="/logo-contija.png" alt="Contija Contabilidade" width={90} height={0} style={{ height: "auto" }} />
          </div>
          <h3>DEMONSTRATIVO DE PAGAMENTO</h3>
        </div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>{isSimples ? "Simples Nacional" : "Lucro Presumido"}</div>
      </div>

      <div className="doc-body">
        <div className="doc-info">
          <span>EMPRESA:</span>
          <b>{cliente.empresa}</b>
          <span>PROFISSIONAL:</span>
          <b>{cliente.profissional || "—"}</b>
        </div>

        <table>
          <thead>
            <tr>
              <th></th>
              {r.linhas.map((l) => (
                <th key={l.notaFiscalId}>
                  {l.tomador || "—"}
                  <br />
                  <span style={{ fontWeight: 400 }}>NF {l.numero || "—"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>VALOR BRUTO DA NF</b>
              </td>
              {r.linhas.map((l) => (
                <td className="num" key={l.notaFiscalId}>
                  <b>{brl(l.vb)}</b>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="section-title" style={{ marginTop: 14 }}>
          Retenções na Fonte
        </div>
        <table>
          <tbody>
            {isSimples ? (
              <tr>
                <td>ISS RET (retido na nota)</td>
                {r.linhas.map((l) => (
                  <td className="num" key={l.notaFiscalId}>
                    {brl(l.issRet)} <span className="hint">({pct(l.issRetPct)})</span>
                  </td>
                ))}
              </tr>
            ) : (
              <>
                <tr>
                  <td>ISS RET - 3%</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.issRet)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>PIS - 0,65%</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.pis)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>COFINS - 3%</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.cofins)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>CSLL - 1%</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.csllRet)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>IR (retido na nota)</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.irRet)} <span className="hint">({pct(l.irRetPct)})</span>
                    </td>
                  ))}
                </tr>
              </>
            )}
            <tr className="total-row">
              <td>Total de Retenções</td>
              {r.linhas.map((l) => (
                <td className="num" key={l.notaFiscalId}>
                  {brl(l.totalRetencoes)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="section-title" style={{ marginTop: 14 }}>
          Provisões
        </div>
        <table>
          <tbody>
            {isSimples ? (
              <tr>
                <td>
                  Provisão DAS (alíq. mensal {(cliente.aliquotaSimplesMensal ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% − retenções da NF)
                </td>
                {r.linhas.map((l) => (
                  <td className="num" key={l.notaFiscalId}>
                    {brl(l.provDas)}
                  </td>
                ))}
              </tr>
            ) : (
              <>
                <tr>
                  <td>IRPJ (4,8% − IR retido na nota)</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.provIrpj)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>CSLL - 1,88%</td>
                  {r.linhas.map((l) => (
                    <td className="num" key={l.notaFiscalId}>
                      {brl(l.provCsll)}
                    </td>
                  ))}
                </tr>
              </>
            )}
            <tr className="total-row">
              <td>Total de Provisões</td>
              {r.linhas.map((l) => (
                <td className="num" key={l.notaFiscalId}>
                  {brl(l.totalProvisoes)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="section-title" style={{ marginTop: 14 }}>
          Custos Fixos Mensais
        </div>
        <table>
          <tbody>
            {custosUsados.length ? (
              custosUsados.map((cf, i) => (
                <tr key={i}>
                  <td>{cf.desc || "—"}</td>
                  <td className="num">{brl(cf.valor)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="empty">
                  Nenhum custo fixo aplicado neste demonstrativo
                </td>
              </tr>
            )}
            <tr className="total-row">
              <td>Total</td>
              <td className="num">{brl(r.totalCustoFixo)}</td>
            </tr>
          </tbody>
        </table>
        <div className="hint" style={{ marginBottom: 10 }}>
          O custo fixo mensal é descontado uma única vez, na primeira nota do período.
        </div>

        <table style={{ marginTop: 14 }}>
          <tbody>
            <tr className="total-row">
              <td>Valor Líquido</td>
              {r.linhas.map((l) => (
                <td className="num" key={l.notaFiscalId}>
                  {brl(l.valorLiquido)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <table style={{ marginTop: 14 }}>
          <tbody>
            <tr className="grand-row">
              <td>VALOR LÍQUIDO NF (total)</td>
              <td className="num">{brl(r.valorLiquidoNfGeral)}</td>
            </tr>
            <tr className="grand-row">
              <td>VALOR A SER TRANSFERIDO</td>
              <td className="num">{brl(r.valorATransferir)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
