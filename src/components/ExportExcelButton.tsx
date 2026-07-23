"use client";

import type { ResultadoCalculo } from "@/lib/calculo/tributos";
import type { DemonstrativoClienteInfo } from "@/components/DemonstrativoDocument";
import { exportDemonstrativoExcel } from "@/lib/excel/exportDemonstrativo";

interface Props {
  cliente: DemonstrativoClienteInfo;
  resultado: ResultadoCalculo;
  custosUsados: { desc: string; valor: number }[];
  nomeArquivoBase?: string;
}

export function ExportExcelButton({ cliente, resultado, custosUsados, nomeArquivoBase }: Props) {
  return (
    <button
      className="btn ghost"
      onClick={() => exportDemonstrativoExcel(cliente, resultado, custosUsados, nomeArquivoBase)}
    >
      Baixar em Excel
    </button>
  );
}
