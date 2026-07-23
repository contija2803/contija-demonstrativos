import Decimal from "decimal.js";

export type Regime = "PRESUMIDO" | "SIMPLES";
export type TipoTomador = "PF" | "PJ";

// Percentuais fixos do regime de Lucro Presumido (ver protótipo original)
export const ALIQ_ISS_RET_PRESUMIDO = 0.03;
export const ALIQ_PIS_PRESUMIDO = 0.0065;
export const ALIQ_COFINS_PRESUMIDO = 0.03;
export const ALIQ_CSLL_RET_PRESUMIDO = 0.01;
export const ALIQ_PRESUMIDO_IRPJ = 0.048;
export const ALIQ_PRESUMIDO_CSLL = 0.0188;

export interface NotaFiscalCalcInput {
  id: string;
  tomador: string;
  numero: string;
  valorBruto: number;
  /** % informado na própria nota, ex.: 1.5 significa 1,5% (Presumido) */
  irRetPct?: number | null;
  /** % informado na própria nota, ex.: 3 significa 3% (Simples) */
  issRetPct?: number | null;
  /** Usado só para agrupar notas de Pessoa Física num único item no documento final. */
  tipoTomador?: TipoTomador | null;
}

export interface CustoFixoCalcInput {
  id: string;
  desc: string;
  valor: number;
  /** null/ausente = dividido igualmente entre todos os sócios; preenchido = 100% descontado só deste sócio. */
  socioId?: string | null;
}

export interface ClienteCalcInput {
  regime: Regime;
  /** alíquota mensal efetiva do Simples atual, ex.: 11.2 significa 11,2% */
  aliquotaSimplesMensal?: number | null;
}

export interface LinhaCalculada {
  notaFiscalId: string;
  tomador: string;
  numero: string;
  tipoTomador?: TipoTomador | null;
  vb: number;
  issRet: number;
  issRetPct: number;
  pis: number;
  cofins: number;
  csllRet: number;
  irRet: number;
  irRetPct: number;
  totalRetencoes: number;
  provIrpj: number;
  provCsll: number;
  provDas: number;
  totalProvisoes: number;
  custoFixoAplicado: number;
  valorLiquido: number;
  valorLiquidoNf: number;
}

export interface ResultadoCalculo {
  linhas: LinhaCalculada[];
  totalCustoFixo: number;
  totalValorBruto: number;
  totalRetencoesGeral: number;
  totalProvisoesGeral: number;
  valorLiquidoNfGeral: number;
  valorATransferir: number;
}

function d(v: number | null | undefined): Decimal {
  return new Decimal(v ?? 0);
}

function round2(value: Decimal): number {
  return value.toDecimalPlaces(2).toNumber();
}

function calcularLinhaPresumido(nf: NotaFiscalCalcInput, custoFixoAplicado: number): LinhaCalculada {
  const vb = d(nf.valorBruto);
  const irRetPct = d(nf.irRetPct).div(100);

  const issRet = vb.mul(ALIQ_ISS_RET_PRESUMIDO);
  const pis = vb.mul(ALIQ_PIS_PRESUMIDO);
  const cofins = vb.mul(ALIQ_COFINS_PRESUMIDO);
  const csllRet = vb.mul(ALIQ_CSLL_RET_PRESUMIDO);
  const irRet = vb.mul(irRetPct);
  const totalRetencoes = issRet.plus(pis).plus(cofins).plus(csllRet).plus(irRet);

  const provIrpj = Decimal.max(0, new Decimal(ALIQ_PRESUMIDO_IRPJ).minus(irRetPct)).mul(vb);
  const provCsll = vb.mul(ALIQ_PRESUMIDO_CSLL);
  const totalProvisoes = provIrpj.plus(provCsll);

  const custoFixo = d(custoFixoAplicado);
  const valorLiquido = vb.minus(totalRetencoes).minus(totalProvisoes).minus(custoFixo);
  const valorLiquidoNf = vb.minus(totalRetencoes);

  return {
    notaFiscalId: nf.id,
    tomador: nf.tomador,
    numero: nf.numero,
    tipoTomador: nf.tipoTomador,
    vb: round2(vb),
    issRet: round2(issRet),
    issRetPct: 0,
    pis: round2(pis),
    cofins: round2(cofins),
    csllRet: round2(csllRet),
    irRet: round2(irRet),
    irRetPct: irRetPct.toNumber(),
    totalRetencoes: round2(totalRetencoes),
    provIrpj: round2(provIrpj),
    provCsll: round2(provCsll),
    provDas: 0,
    totalProvisoes: round2(totalProvisoes),
    custoFixoAplicado: round2(custoFixo),
    valorLiquido: round2(valorLiquido),
    valorLiquidoNf: round2(valorLiquidoNf),
  };
}

function calcularLinhaSimples(
  cliente: ClienteCalcInput,
  nf: NotaFiscalCalcInput,
  custoFixoAplicado: number
): LinhaCalculada {
  const vb = d(nf.valorBruto);
  const issRetPct = d(nf.issRetPct).div(100);
  const aliquotaSimplesMensal = d(cliente.aliquotaSimplesMensal).div(100);

  const issRet = vb.mul(issRetPct);
  const totalRetencoes = issRet;

  const provDas = Decimal.max(0, aliquotaSimplesMensal.minus(issRetPct)).mul(vb);
  const totalProvisoes = provDas;

  const custoFixo = d(custoFixoAplicado);
  const valorLiquido = vb.minus(totalRetencoes).minus(totalProvisoes).minus(custoFixo);
  const valorLiquidoNf = vb.minus(totalRetencoes);

  return {
    notaFiscalId: nf.id,
    tomador: nf.tomador,
    numero: nf.numero,
    tipoTomador: nf.tipoTomador,
    vb: round2(vb),
    issRet: round2(issRet),
    issRetPct: issRetPct.toNumber(),
    pis: 0,
    cofins: 0,
    csllRet: 0,
    irRet: 0,
    irRetPct: 0,
    totalRetencoes: round2(totalRetencoes),
    provIrpj: 0,
    provCsll: 0,
    provDas: round2(provDas),
    totalProvisoes: round2(totalProvisoes),
    custoFixoAplicado: round2(custoFixo),
    valorLiquido: round2(valorLiquido),
    valorLiquidoNf: round2(valorLiquidoNf),
  };
}

function calcularLinha(
  cliente: ClienteCalcInput,
  nf: NotaFiscalCalcInput,
  custoFixoAplicado: number
): LinhaCalculada {
  return cliente.regime === "PRESUMIDO"
    ? calcularLinhaPresumido(nf, custoFixoAplicado)
    : calcularLinhaSimples(cliente, nf, custoFixoAplicado);
}

/**
 * Calcula o demonstrativo completo para um lote de notas fiscais incluídas.
 * O custo fixo total do cliente é descontado uma única vez, na primeira nota do lote.
 */
export function calcularDemonstrativo(
  cliente: ClienteCalcInput,
  notas: NotaFiscalCalcInput[],
  custosFixosAtivos: CustoFixoCalcInput[]
): ResultadoCalculo {
  const totalCustoFixo = round2(custosFixosAtivos.reduce((s, cf) => s.plus(d(cf.valor)), new Decimal(0)));

  const linhas = notas.map((nf, idx) => calcularLinha(cliente, nf, idx === 0 ? totalCustoFixo : 0));

  const sumField = (key: keyof LinhaCalculada): number =>
    round2(linhas.reduce((s, l) => s.plus(d(l[key] as number)), new Decimal(0)));

  return {
    linhas,
    totalCustoFixo,
    totalValorBruto: sumField("vb"),
    totalRetencoesGeral: sumField("totalRetencoes"),
    totalProvisoesGeral: sumField("totalProvisoes"),
    valorLiquidoNfGeral: sumField("valorLiquidoNf"),
    valorATransferir: sumField("valorLiquido"),
  };
}

/**
 * Agrupa todas as linhas de Pessoa Física (paciente) numa única linha "Pessoa
 * Física", somando os valores — evita listar cada paciente individualmente no
 * demonstrativo do médico. Notas de Pessoa Jurídica continuam individuais.
 */
export function agruparPessoasFisicas(resultado: ResultadoCalculo): ResultadoCalculo {
  const linhasPF = resultado.linhas.filter((l) => l.tipoTomador === "PF");
  const linhasOutras = resultado.linhas.filter((l) => l.tipoTomador !== "PF");

  if (linhasPF.length === 0) return resultado;

  const somaCampo = (key: keyof LinhaCalculada): number =>
    round2(linhasPF.reduce((s, l) => s.plus(d(l[key] as number)), new Decimal(0)));

  const linhaAgrupada: LinhaCalculada = {
    notaFiscalId: linhasPF.map((l) => l.notaFiscalId).join(","),
    tomador: "Pessoa Física",
    numero: `${linhasPF.length} nota(s)`,
    tipoTomador: "PF",
    vb: somaCampo("vb"),
    issRet: somaCampo("issRet"),
    issRetPct: 0,
    pis: somaCampo("pis"),
    cofins: somaCampo("cofins"),
    csllRet: somaCampo("csllRet"),
    irRet: somaCampo("irRet"),
    irRetPct: 0,
    totalRetencoes: somaCampo("totalRetencoes"),
    provIrpj: somaCampo("provIrpj"),
    provCsll: somaCampo("provCsll"),
    provDas: somaCampo("provDas"),
    totalProvisoes: somaCampo("totalProvisoes"),
    custoFixoAplicado: somaCampo("custoFixoAplicado"),
    valorLiquido: somaCampo("valorLiquido"),
    valorLiquidoNf: somaCampo("valorLiquidoNf"),
  };

  return { ...resultado, linhas: [...linhasOutras, linhaAgrupada] };
}

export interface SocioGroup {
  socioId: string;
  socioNome: string;
  notas: NotaFiscalCalcInput[];
}

export interface ResultadoPorSocio {
  socioId: string;
  socioNome: string;
  custosUsados: CustoFixoCalcInput[];
  resultado: ResultadoCalculo;
}

/**
 * Calcula um demonstrativo separado para cada sócio. Custos fixos sem sócio
 * (socioId null/ausente) são divididos igualmente entre TODOS os sócios
 * ativos do cliente (mesmo os sem nota neste lote); custos com um socioId
 * específico são descontados 100% só do demonstrativo daquele sócio, sem
 * entrar na divisão dos demais. Notas de Pessoa Física são agrupadas numa
 * única linha por sócio.
 */
export function calcularDemonstrativosPorSocio(
  cliente: ClienteCalcInput,
  grupos: SocioGroup[],
  custosFixos: CustoFixoCalcInput[],
  numSociosAtivos: number
): ResultadoPorSocio[] {
  const divisor = numSociosAtivos > 0 ? numSociosAtivos : 1;
  const custosDivididos = custosFixos
    .filter((cf) => !cf.socioId)
    .map((cf) => ({ ...cf, valor: round2(d(cf.valor).div(divisor)) }));
  const custosEspecificos = custosFixos.filter((cf) => !!cf.socioId);

  return grupos
    .filter((grupo) => grupo.notas.length > 0)
    .map((grupo) => {
      const custosDoSocio = [...custosDivididos, ...custosEspecificos.filter((cf) => cf.socioId === grupo.socioId)];
      return {
        socioId: grupo.socioId,
        socioNome: grupo.socioNome,
        custosUsados: custosDoSocio,
        resultado: agruparPessoasFisicas(calcularDemonstrativo(cliente, grupo.notas, custosDoSocio)),
      };
    });
}
