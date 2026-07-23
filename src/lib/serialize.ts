import type { Cliente, CustoFixo, NotaFiscal, Socio } from "@prisma/client";

export interface CustoFixoJSON {
  id: string;
  desc: string;
  valor: number;
  ativo: boolean;
}

export interface SocioJSON {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface ClienteJSON {
  id: string;
  empresa: string;
  regime: "PRESUMIDO" | "SIMPLES";
  aliquotaSimplesMensal: number | null;
  custosFixos: CustoFixoJSON[];
  socios: SocioJSON[];
}

/** Converte campos Decimal do Prisma para number puro, para o frontend consumir sem surpresas. */
export function serializeCliente(
  cliente: Cliente & { custosFixos: CustoFixo[]; socios: Socio[] }
): ClienteJSON {
  return {
    id: cliente.id,
    empresa: cliente.empresa,
    regime: cliente.regime,
    aliquotaSimplesMensal: cliente.aliquotaSimplesMensal ? Number(cliente.aliquotaSimplesMensal) : null,
    custosFixos: cliente.custosFixos.map((cf) => ({
      id: cf.id,
      desc: cf.desc,
      valor: Number(cf.valor),
      ativo: cf.ativo,
    })),
    socios: cliente.socios.map((s) => ({ id: s.id, nome: s.nome, ativo: s.ativo })),
  };
}

export interface NotaFiscalJSON {
  id: string;
  tomador: string;
  prestador: string;
  numero: string;
  data: string;
  valorBruto: number;
  irRetPct: number | null;
  issRetPct: number | null;
  incluido: boolean;
  origem: "NOVO" | "PENDENTE_ANTERIOR";
  cancelada: boolean;
  status: "PENDENTE" | "INCLUIDA";
  socioId: string | null;
  descricao: string | null;
}

export function serializeNotaFiscal(nota: NotaFiscal): NotaFiscalJSON {
  return {
    id: nota.id,
    tomador: nota.tomador,
    prestador: nota.prestador,
    numero: nota.numero,
    data: nota.data,
    valorBruto: Number(nota.valorBruto),
    irRetPct: nota.irRetPct !== null ? Number(nota.irRetPct) : null,
    issRetPct: nota.issRetPct !== null ? Number(nota.issRetPct) : null,
    incluido: nota.incluido,
    origem: nota.origem,
    cancelada: nota.cancelada,
    status: nota.status,
    socioId: nota.socioId,
    descricao: nota.descricao,
  };
}
