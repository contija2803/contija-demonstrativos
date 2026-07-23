import * as XLSX from "xlsx";
import type { ResultadoCalculo } from "@/lib/calculo/tributos";
import type { DemonstrativoClienteInfo } from "@/components/DemonstrativoDocument";

export function exportDemonstrativoExcel(
  cliente: DemonstrativoClienteInfo,
  r: ResultadoCalculo,
  custosUsados: { desc: string; valor: number }[],
  nomeArquivoBase?: string
) {
  const isSimples = cliente.regime === "SIMPLES";
  const aoa: (string | number)[][] = [];

  aoa.push(["DEMONSTRATIVO DE PAGAMENTO"]);
  aoa.push([]);
  aoa.push(["EMPRESA:", cliente.empresa]);
  aoa.push(["PROFISSIONAL:", cliente.profissional || ""]);
  aoa.push(["REGIME:", isSimples ? "Simples Nacional" : "Lucro Presumido"]);
  aoa.push([]);
  aoa.push(["", ...r.linhas.map((l) => `${l.tomador || ""} - NF ${l.numero || ""}`)]);
  aoa.push(["VALOR BRUTO DA NF", ...r.linhas.map((l) => l.vb)]);
  aoa.push([]);
  aoa.push(["RETENÇÕES NA FONTE"]);
  if (isSimples) {
    aoa.push(["ISS RET (retido na nota)", ...r.linhas.map((l) => l.issRet)]);
  } else {
    aoa.push(["ISS RET - 3%", ...r.linhas.map((l) => l.issRet)]);
    aoa.push(["PIS - 0,65%", ...r.linhas.map((l) => l.pis)]);
    aoa.push(["COFINS - 3%", ...r.linhas.map((l) => l.cofins)]);
    aoa.push(["CSLL - 1%", ...r.linhas.map((l) => l.csllRet)]);
    aoa.push(["IR (retido na nota)", ...r.linhas.map((l) => l.irRet)]);
  }
  aoa.push(["Total de Retenções", ...r.linhas.map((l) => l.totalRetencoes)]);
  aoa.push([]);
  aoa.push(["PROVISÕES"]);
  if (isSimples) {
    const aliq = cliente.aliquotaSimplesMensal ?? 0;
    aoa.push([`Provisão DAS (aliq. mensal ${aliq.toFixed(2)}% - retenções da NF)`, ...r.linhas.map((l) => l.provDas)]);
  } else {
    aoa.push(["IRPJ (4,8% - IR retido)", ...r.linhas.map((l) => l.provIrpj)]);
    aoa.push(["CSLL - 1,88%", ...r.linhas.map((l) => l.provCsll)]);
  }
  aoa.push(["Total de Provisões", ...r.linhas.map((l) => l.totalProvisoes)]);
  aoa.push([]);
  aoa.push(["CUSTOS FIXOS MENSAIS"]);
  custosUsados.forEach((cf) => aoa.push([cf.desc, cf.valor]));
  aoa.push(["Total", r.totalCustoFixo]);
  aoa.push([]);
  aoa.push(["VALOR LÍQUIDO", ...r.linhas.map((l) => l.valorLiquido)]);
  aoa.push([]);
  aoa.push(["VALOR LÍQUIDO NF (total)", r.valorLiquidoNfGeral]);
  aoa.push(["VALOR A SER TRANSFERIDO", r.valorATransferir]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 32 }, ...r.linhas.map(() => ({ wch: 16 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (cliente.profissional || cliente.empresa).substring(0, 28));
  XLSX.writeFile(wb, `Demonstrativo_${(nomeArquivoBase || cliente.empresa || "cliente").replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
}
